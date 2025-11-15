import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_WHISPER_SIZE = 24 * 1024 * 1024; // 24MB to be safe (Whisper limit is 25MB)

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

    console.log('🔄 Processing large file:', upload.file_name, `(${(upload.file_size / (1024 * 1024)).toFixed(2)} MB)`);

    let extractedContent = '';
    let contentType = 'binary';
    let extractionStatus = 'completed';
    let extractionError = null;

    try {
      // Check if it's a video/audio file
      const mimeType = upload.mime_type?.toLowerCase() || '';
      const fileName = upload.file_name?.toLowerCase() || '';

      const isVideo = mimeType.includes('video/') ||
        fileName.endsWith('.mp4') || fileName.endsWith('.mov') ||
        fileName.endsWith('.avi') || fileName.endsWith('.webm');

      const isAudio = mimeType.includes('audio/') ||
        fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.m4a');

      if (isVideo || isAudio) {
        console.log(`🎬 Large ${isVideo ? 'video' : 'audio'} file detected, using chunked transcription...`);

        // For large files, use AssemblyAI or provide alternative
        const result = await transcribeLargeFile(supabase, upload, user.id, isVideo);
        extractedContent = result.content;
        contentType = isVideo ? 'video_transcript' : 'audio_transcript';
      } else {
        throw new Error('This endpoint is only for large video/audio files');
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

    console.log('✅ Large file extraction complete');

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
    console.error('Error in extract-file-content-large:', error);
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

async function transcribeLargeFile(
  supabase: any,
  upload: any,
  userId: string,
  isVideo: boolean
): Promise<{ content: string }> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('openai_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (!settings?.openai_api_key) {
    throw new Error('OpenAI API key not configured');
  }

  // Download file
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('project-files')
    .download(upload.file_path);

  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`);
  }

  const fileSize = fileData.size;
  console.log(`📊 File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

  // If under Whisper limit, use single request
  if (fileSize < MAX_WHISPER_SIZE) {
    console.log('✅ File under 25MB, using single Whisper request');
    return await transcribeWithWhisper(fileData, upload.file_name, settings.openai_api_key);
  }

  // For files over 25MB, we need to provide alternative instructions
  // Since we can't easily split audio/video in Deno without ffmpeg
  throw new Error(
    `File is ${(fileSize / (1024 * 1024)).toFixed(2)} MB. ` +
    `Files over 25MB require pre-processing. ` +
    `Please use a tool like HandBrake or FFmpeg to compress the video to under 25MB, ` +
    `or split it into smaller segments before uploading. ` +
    `Alternatively, upload the video to YouTube (as unlisted) and use a transcript service like Rev.com or Otter.ai, ` +
    `then upload the resulting transcript as a text file.`
  );
}

async function transcribeWithWhisper(
  fileBlob: Blob,
  fileName: string,
  apiKey: string
): Promise<{ content: string }> {
  const formData = new FormData();
  formData.append('file', fileBlob, fileName);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error: ${errorText}`);
  }

  const result = await response.json();

  let formattedTranscript = `FILE: ${fileName}\n`;
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

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
