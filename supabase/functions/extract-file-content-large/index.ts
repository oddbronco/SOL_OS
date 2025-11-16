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

    const contentType = req.headers.get('content-type') || '';
    let uploadId: string;
    let fileBlob: Blob | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      uploadId = formData.get('uploadId') as string;
      fileBlob = formData.get('file') as Blob;

      if (!uploadId) {
        throw new Error('Missing uploadId in form data');
      }
      if (!fileBlob) {
        throw new Error('Missing file in form data');
      }
    } else {
      const body = await req.json();
      uploadId = body.uploadId;

      if (!uploadId) {
        throw new Error('Missing uploadId parameter');
      }
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
        const result = await transcribeLargeFile(supabase, upload, user.id, isVideo, fileBlob);
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
  isVideo: boolean,
  providedFileBlob: Blob | null = null
): Promise<{ content: string }> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('openai_api_key, assemblyai_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  let fileData: Blob;
  let fileSize: number;

  if (providedFileBlob) {
    console.log('📦 Using directly provided file blob');
    fileData = providedFileBlob;
    fileSize = fileData.size;
  } else {
    const { data: downloadedFile, error: downloadError } = await supabase
      .storage
      .from('project-files')
      .download(upload.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    fileData = downloadedFile;
    fileSize = fileData.size;
  }

  console.log(`📊 File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

  // If under Whisper limit and OpenAI is configured, use Whisper
  if (fileSize < MAX_WHISPER_SIZE && settings?.openai_api_key) {
    console.log('✅ File under 25MB, using single Whisper request');
    return await transcribeWithWhisper(fileData, upload.file_name, settings.openai_api_key);
  }

  // For files over 25MB, use AssemblyAI if configured
  if (settings?.assemblyai_api_key) {
    console.log(`🎙️ File over 25MB (${(fileSize / (1024 * 1024)).toFixed(2)} MB), using AssemblyAI`);
    return await transcribeWithAssemblyAI(fileData, upload.file_name, settings.assemblyai_api_key);
  }

  // No appropriate transcription service configured
  throw new Error(
    `File is ${(fileSize / (1024 * 1024)).toFixed(2)} MB. ` +
    `Files over 25MB require AssemblyAI to be configured. ` +
    `Please add your AssemblyAI API key in Settings.`
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

async function transcribeWithAssemblyAI(
  fileBlob: Blob,
  fileName: string,
  apiKey: string
): Promise<{ content: string }> {
  console.log('📤 Uploading file to AssemblyAI...');

  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
    },
    body: fileBlob,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`AssemblyAI upload error: ${errorText}`);
  }

  const { upload_url } = await uploadResponse.json();
  console.log('✅ File uploaded to AssemblyAI');
  console.log('🎙️ Starting transcription...');

  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
    }),
  });

  if (!transcriptResponse.ok) {
    const errorText = await transcriptResponse.text();
    throw new Error(`AssemblyAI transcription error: ${errorText}`);
  }

  const { id: transcriptId } = await transcriptResponse.json();

  let transcript;
  let attempts = 0;
  const maxAttempts = 120;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to check transcription status');
    }

    transcript = await statusResponse.json();

    if (transcript.status === 'completed') {
      console.log('✅ Transcription completed');
      break;
    } else if (transcript.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    }

    attempts++;
    console.log(`⏳ Transcription in progress... (${attempts * 5}s)`);
  }

  if (!transcript || transcript.status !== 'completed') {
    throw new Error('Transcription timed out');
  }

  let formattedTranscript = `FILE: ${fileName}\n`;
  formattedTranscript += `Duration: ${transcript.audio_duration ? Math.round(transcript.audio_duration) + 's' : 'Unknown'}\n`;
  formattedTranscript += `Confidence: ${transcript.confidence ? (transcript.confidence * 100).toFixed(1) + '%' : 'N/A'}\n\n`;
  formattedTranscript += `=== TRANSCRIPT ===\n\n`;

  if (transcript.utterances && transcript.utterances.length > 0) {
    transcript.utterances.forEach((utterance: any) => {
      const timestamp = formatTimestamp(utterance.start / 1000);
      const speaker = utterance.speaker ? `Speaker ${utterance.speaker}` : 'Speaker';
      formattedTranscript += `[${timestamp}] ${speaker}: ${utterance.text}\n`;
    });
  } else if (transcript.words && transcript.words.length > 0) {
    let currentTime = 0;
    let currentSegment = '';

    transcript.words.forEach((word: any, index: number) => {
      if (word.start / 1000 - currentTime > 30 || index === 0) {
        if (currentSegment) {
          const timestamp = formatTimestamp(currentTime);
          formattedTranscript += `[${timestamp}] ${currentSegment.trim()}\n`;
        }
        currentTime = word.start / 1000;
        currentSegment = word.text + ' ';
      } else {
        currentSegment += word.text + ' ';
      }
    });

    if (currentSegment) {
      const timestamp = formatTimestamp(currentTime);
      formattedTranscript += `[${timestamp}] ${currentSegment.trim()}\n`;
    }
  } else {
    formattedTranscript += transcript.text;
  }

  return { content: formattedTranscript };
}
