import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversionRequest {
  videoId: string;
  sourceUrl: string;
  sourceFormat: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { videoId, sourceUrl, sourceFormat }: ConversionRequest = await req.json();

    console.log(`🎬 Starting conversion for video ${videoId}: ${sourceFormat} → MP4`);

    // Get the video to find the user who uploaded it
    const { data: videoData, error: videoError } = await supabase
      .from('project_intro_videos')
      .select('created_by')
      .eq('id', videoId)
      .single();

    if (videoError || !videoData) {
      throw new Error('Video not found');
    }

    // Get user's CloudConvert API key
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('cloudconvert_api_key')
      .eq('user_id', videoData.created_by)
      .maybeSingle();

    // Try user's key first, fallback to system key
    let cloudConvertApiKey = settingsData?.cloudconvert_api_key || Deno.env.get('CLOUDCONVERT_API_KEY');

    if (!cloudConvertApiKey) {
      throw new Error('CloudConvert API key not configured. Please add your API key in Settings → Integrations.');
    }

    console.log(`🔑 Using ${settingsData?.cloudconvert_api_key ? 'user' : 'system'} CloudConvert API key`);

    // Update status to converting
    await supabase
      .from('project_intro_videos')
      .update({
        conversion_status: 'converting',
        conversion_started_at: new Date().toISOString()
      })
      .eq('id', videoId);

    // Step 1: Create CloudConvert job
    console.log('📤 Creating CloudConvert job...');
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-video': {
            operation: 'import/url',
            url: sourceUrl,
            filename: `input.${sourceFormat}`
          },
          'convert-to-mp4': {
            operation: 'convert',
            input: 'import-video',
            output_format: 'mp4',
            engine: 'ffmpeg',
            video_codec: 'h264',
            audio_codec: 'aac',
            preset: 'web'
          },
          'export-mp4': {
            operation: 'export/url',
            input: 'convert-to-mp4'
          }
        },
        tag: `video-${videoId}`
      })
    });

    if (!createJobResponse.ok) {
      const error = await createJobResponse.text();
      throw new Error(`CloudConvert job creation failed: ${error}`);
    }

    const job = await createJobResponse.json();
    const jobId = job.data.id;
    console.log(`✅ Job created: ${jobId}`);

    // Step 2: Poll for job completion (max 5 minutes)
    console.log('⏳ Waiting for conversion to complete...');
    let attempts = 0;
    const maxAttempts = 60;
    let jobStatus = 'processing';
    let convertedFileUrl: string | null = null;

    while (attempts < maxAttempts && jobStatus !== 'finished' && jobStatus !== 'error') {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
        }
      });

      const statusData = await statusResponse.json();
      jobStatus = statusData.data.status;

      console.log(`📊 Job status: ${jobStatus} (attempt ${attempts + 1}/${maxAttempts})`);

      if (jobStatus === 'finished') {
        const exportTask = statusData.data.tasks.find((t: any) => t.operation === 'export/url');
        if (exportTask?.result?.files?.[0]?.url) {
          convertedFileUrl = exportTask.result.files[0].url;
        }
      } else if (jobStatus === 'error') {
        const errorTask = statusData.data.tasks.find((t: any) => t.status === 'error');
        throw new Error(`Conversion failed: ${errorTask?.message || 'Unknown error'}`);
      }

      attempts++;
    }

    if (!convertedFileUrl) {
      throw new Error('Conversion timeout or no output file');
    }

    console.log('✅ Conversion complete, downloading MP4...');

    // Step 3: Download the converted MP4
    const mp4Response = await fetch(convertedFileUrl);
    if (!mp4Response.ok) {
      throw new Error('Failed to download converted file');
    }

    const mp4Blob = await mp4Response.blob();
    console.log(`📦 Downloaded MP4: ${mp4Blob.size} bytes`);

    // Step 4: Upload to Supabase Storage
    const fileName = sourceUrl.split('/').pop()?.replace(/\.(webm|mov|avi)$/i, '.mp4') || `${videoId}.mp4`;
    const storagePath = fileName;

    console.log(`📤 Uploading to storage: ${storagePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-intro-videos')
      .upload(storagePath, mp4Blob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('project-intro-videos')
      .getPublicUrl(storagePath);

    console.log(`✅ Uploaded to: ${publicUrl}`);

    // Step 5: Update database with new MP4 URL
    const { error: updateError } = await supabase
      .from('project_intro_videos')
      .update({
        video_url: publicUrl,
        conversion_status: 'completed',
        conversion_completed_at: new Date().toISOString()
      })
      .eq('id', videoId);

    if (updateError) throw updateError;

    // Step 6: Delete old file if different
    if (sourceUrl !== publicUrl) {
      const oldPath = sourceUrl.split('/project-intro-videos/')[1];
      if (oldPath) {
        console.log(`🗑️ Deleting old file: ${oldPath}`);
        await supabase.storage
          .from('project-intro-videos')
          .remove([oldPath]);
      }
    }

    console.log('🎉 Conversion complete!');

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        mp4Url: publicUrl,
        message: 'Video converted to MP4 successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('❌ Conversion error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Conversion failed'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});