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

    console.log('\ud83d\udd04 Processing file:', upload.file_name);

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
        console.log('\ud83d\udcf9 Detected video file, transcribing...');
        const result = await transcribeVideo(supabase, upload, user.id);
        extractedContent = result.content;
        contentType = 'video_transcript';

      } else if (
        mimeType.includes('audio/') ||
        fileName.endsWith('.mp3') ||
        fileName.endsWith('.wav') ||
        fileName.endsWith('.m4a')
      ) {
        console.log('\ud83c\udfb5 Detected audio file, transcribing...');
        const result = await transcribeAudio(supabase, upload, user.id);
        extractedContent = result.content;
        contentType = 'audio_transcript';

      } else if (
        mimeType.includes('text/') ||
        fileName.endsWith('.txt') ||
        fileName.endsWith('.md') ||
        fileName.endsWith('.csv')
      ) {
        console.log('\ud83d\udcc4 Detected text file, extracting...');
        const result = await extractTextFile(supabase, upload);
        extractedContent = result.content;
        contentType = 'text';

      } else if (
        fileName.endsWith('.json') ||
        mimeType.includes('json')
      ) {
        console.log('\ud83d\udcca Detected JSON file, extracting...');
        const result = await extractTextFile(supabase, upload);
        extractedContent = result.content;
        contentType = 'structured_data';

      } else if (
        mimeType.includes('image/') ||
        fileName.match(/\\.(jpg|jpeg|png|gif|bmp|webp)$/)
      ) {
        console.log('\ud83d\uddbc\ufe0f Detected image file (OCR not implemented yet)');
        extractionStatus = 'not_applicable';
        contentType = 'binary';

      } else {
        console.log('\u2753 Unsupported file type for extraction');
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

    console.log('\u2705 Extraction complete:', {
      contentType,
      wordCount: extractedContent.split(/\\s+/).length,
      status: extractionStatus
    });

    return new Response(
      JSON.stringify({
        success: true,
        uploadId,
        contentType,
        extractionStatus,
        wordCount: extractedContent ? extractedContent.split(/\\s+/).length : 0,
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
    .select('openai_api_key, assemblyai_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  const fileSize = upload.file_size || 0;
  const MAX_WHISPER_SIZE = 24 * 1024 * 1024;

  console.log(`\ud83d\udcca File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

  if (fileSize > MAX_WHISPER_SIZE) {
    console.log('\u26a0\ufe0f File exceeds 24MB, checking for AssemblyAI...');

    if (settings?.assemblyai_api_key) {
      console.log('\ud83c\udfaf Using AssemblyAI for large file transcription');
      return await transcribeWithAssemblyAI(supabase, upload, settings.assemblyai_api_key);
    } else {
      throw new Error(
        `File is ${(fileSize / (1024 * 1024)).toFixed(2)} MB, which exceeds OpenAI Whisper's 25MB limit. ` +
        `To transcribe large files, please add your AssemblyAI API key in Settings. ` +
        `AssemblyAI supports files of any size and costs $0.00025/second ($0.015/minute). ` +
        `Get a free API key at https://www.assemblyai.com/`
      );
    }
  }

  if (!settings?.openai_api_key) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('\u2705 Using OpenAI Whisper for transcription');

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

  let formattedTranscript = `VIDEO TRANSCRIPT: ${upload.file_name}\\n`;
  formattedTranscript += `Duration: ${result.duration ? Math.round(result.duration) + 's' : 'Unknown'}\\n`;
  formattedTranscript += `Language: ${result.language || 'en'}\\n`;
  formattedTranscript += `Transcription Service: OpenAI Whisper\\n\\n`;
  formattedTranscript += `=== TRANSCRIPT ===\\n\\n`;

  if (result.segments && result.segments.length > 0) {
    result.segments.forEach((segment: any) => {
      const timestamp = formatTimestamp(segment.start);
      formattedTranscript += `[${timestamp}] ${segment.text}\\n`;
    });
  } else {
    formattedTranscript += result.text;
  }

  return { content: formattedTranscript };
}

async function transcribeWithAssemblyAI(supabase: any, upload: any, apiKey: string): Promise<{ content: string }> {
  console.log('\ud83d\ude80 Starting AssemblyAI transcription...');

  const { data: urlData } = await supabase
    .storage
    .from('project-files')
    .createSignedUrl(upload.file_path, 3600);

  if (!urlData) {
    throw new Error('Failed to create signed URL for file');
  }

  const uploadResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: urlData.signedUrl,
      language_code: 'en',
    }),
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`AssemblyAI upload error: ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  const transcriptId = uploadResult.id;

  console.log(`\u23f3 Transcription queued (ID: ${transcriptId}), polling for completion...`);

  let attempts = 0;
  const maxAttempts = 300;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to check transcription status');
    }

    const statusResult = await statusResponse.json();

    if (statusResult.status === 'completed') {
      console.log('\u2705 AssemblyAI transcription completed!');

      let formattedTranscript = `VIDEO TRANSCRIPT: ${upload.file_name}\\n`;
      formattedTranscript += `Duration: ${statusResult.audio_duration ? Math.round(statusResult.audio_duration) + 's' : 'Unknown'}\\n`;
      formattedTranscript += `Language: ${statusResult.language_code || 'en'}\\n`;
      formattedTranscript += `Transcription Service: AssemblyAI\\n`;
      formattedTranscript += `Confidence: ${statusResult.confidence ? (statusResult.confidence * 100).toFixed(1) + '%' : 'N/A'}\\n\\n`;
      formattedTranscript += `=== TRANSCRIPT ===\\n\\n`;

      if (statusResult.words && statusResult.words.length > 0) {
        let currentSentence = '';
        let sentenceStart = 0;

        statusResult.words.forEach((word: any, idx: number) => {
          if (idx === 0 || word.start - sentenceStart > 30000) {
            if (currentSentence) {
              formattedTranscript += `[${formatTimestamp(sentenceStart / 1000)}] ${currentSentence.trim()}\\n`;
            }
            currentSentence = word.text;
            sentenceStart = word.start;
          } else {
            currentSentence += ' ' + word.text;
          }
        });

        if (currentSentence) {
          formattedTranscript += `[${formatTimestamp(sentenceStart / 1000)}] ${currentSentence.trim()}\\n`;
        }
      } else {
        formattedTranscript += statusResult.text;
      }

      return { content: formattedTranscript };

    } else if (statusResult.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${statusResult.error}`);
    }

    attempts++;
    if (attempts % 10 === 0) {
      console.log(`\u23f3 Still processing... (${attempts}s elapsed, status: ${statusResult.status})`);
    }
  }

  throw new Error('Transcription timeout - file may be too long. Please try a shorter file.');
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
    content: `FILE: ${upload.file_name}\\n${upload.description ? `Description: ${upload.description}\\n` : ''}\\n=== CONTENT ===\\n\\n${text}`
  };
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}