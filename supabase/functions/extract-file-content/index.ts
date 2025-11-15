import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { uploadId } = await req.json();

    if (!uploadId) {
      throw new Error('Missing uploadId parameter');
    }

    const { data: upload, error: uploadError } = await supabase
      .from('project_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error('Upload not found');
    }

    await supabase
      .from('project_uploads')
      .update({ extraction_status: 'processing' })
      .eq('id', uploadId);

    console.log('🔄 Processing file:', upload.file_name);

    const mimeType = upload.mime_type?.toLowerCase() || '';
    const fileName = upload.file_name?.toLowerCase() || '';

    let extractedContent = '';
    let contentType = 'binary';
    let extractionStatus = 'completed';
    let extractionError = null;

    try {
      if (
        mimeType.includes('video/') ||
        fileName.endsWith('.mp4') ||
        fileName.endsWith('.mov') ||
        fileName.endsWith('.avi') ||
        fileName.endsWith('.webm')
      ) {
        console.log('📹 Detected video file, transcribing...');
        const result = await transcribeVideo(supabase, upload, user.id);
        extractedContent = result.content;
        contentType = 'video_transcript';

      } else if (
        mimeType.includes('audio/') ||
        fileName.endsWith('.mp3') ||
        fileName.endsWith('.wav') ||
        fileName.endsWith('.m4a')
      ) {
        console.log('🎵 Detected audio file, transcribing...');
        const result = await transcribeAudio(supabase, upload, user.id);
        extractedContent = result.content;
        contentType = 'audio_transcript';

      } else if (
        mimeType.includes('text/') ||
        fileName.endsWith('.txt') ||
        fileName.endsWith('.md') ||
        fileName.endsWith('.csv')
      ) {
        console.log('📄 Detected text file, extracting...');
        const result = await extractTextFile(supabase, upload);
        extractedContent = result.content;
        contentType = 'text';

      } else if (
        fileName.endsWith('.json') ||
        mimeType.includes('json')
      ) {
        console.log('📊 Detected JSON file, extracting...');
        const result = await extractTextFile(supabase, upload);
        extractedContent = result.content;
        contentType = 'structured_data';

      } else if (
        mimeType.includes('image/') ||
        fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
      ) {
        console.log('🖼️ Detected image file (OCR not implemented yet)');
        extractionStatus = 'not_applicable';
        contentType = 'binary';

      } else {
        console.log('❓ Unsupported file type for extraction');
        extractionStatus = 'not_applicable';
        contentType = 'binary';
      }

    } catch (error: any) {
      console.error('Error extracting content:', error);
      extractionStatus = 'failed';
      extractionError = error.message;
    }

    await supabase
      .from('project_uploads')
      .update({
        extracted_content: extractedContent || null,
        content_type: contentType,
        extraction_status: extractionStatus,
        extraction_error: extractionError,
      })
      .eq('id', uploadId);

    console.log('✅ Extraction complete:', {
      contentType,
      wordCount: extractedContent.split(/\s+/).length,
      status: extractionStatus
    });

    return new Response(
      JSON.stringify({
        success: true,
        uploadId,
        contentType,
        extractionStatus,
        wordCount: extractedContent ? extractedContent.split(/\s+/).length : 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error in extract-file-content:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});

async function transcribeVideo(supabase: any, upload: any, userId: string): Promise<{ content: string }> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('openai_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (!settings?.openai_api_key) {
    throw new Error('OpenAI API key not configured');
  }

  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('project-files')
    .download(upload.file_path);

  if (downloadError) {
    throw new Error(`Failed to download video: ${downloadError.message}`);
  }

  const formData = new FormData();
  formData.append('file', fileData, upload.file_name);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.openai_api_key}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error: ${errorText}`);
  }

  const result = await response.json();

  let formattedTranscript = `VIDEO TRANSCRIPT: ${upload.file_name}\n`;
  formattedTranscript += `Duration: ${result.duration ? Math.round(result.duration) + 's' : 'Unknown'}\n`;
  formattedTranscript += `Language: ${result.language || 'en'}\n\n`;
  formattedTranscript += `=== TRANSCRIPT ===\n\n`;

  if (result.segments && result.segments.length > 0) {
    result.segments.forEach((segment: any) => {
      const timestamp = formatTimestamp(segment.start);
      formattedTranscript += `[${timestamp}] ${segment.text}\n`;
    });
  } else {
    formattedTranscript += result.text;
  }

  return { content: formattedTranscript };
}

async function transcribeAudio(supabase: any, upload: any, userId: string): Promise<{ content: string }> {
  const result = await transcribeVideo(supabase, upload, userId);
  return {
    content: result.content.replace('VIDEO TRANSCRIPT:', 'AUDIO TRANSCRIPT:')
  };
}

async function extractTextFile(supabase: any, upload: any): Promise<{ content: string }> {
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('project-files')
    .download(upload.file_path);

  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`);
  }

  const text = await fileData.text();

  return {
    content: `FILE: ${upload.file_name}\n${upload.description ? `Description: ${upload.description}\n` : ''}\n=== CONTENT ===\n\n${text}`
  };
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}