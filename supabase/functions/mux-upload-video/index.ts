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

    const { videoId, projectId } = await req.json();

    if (!videoId || !projectId) {
      throw new Error('Missing required parameters');
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('mux_token_id, mux_token_secret')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings?.mux_token_id || !settings?.mux_token_secret) {
      throw new Error('Mux credentials not configured');
    }

    const { data: video } = await supabase
      .from('project_intro_videos')
      .select('video_url')
      .eq('id', videoId)
      .single();

    if (!video) {
      throw new Error('Video not found');
    }

    const basicAuth = btoa(`${settings.mux_token_id}:${settings.mux_token_secret}`);

    const { data: appSettings } = await supabase
      .from('user_settings')
      .select('app_domain')
      .eq('user_id', user.id)
      .maybeSingle();

    const corsOrigin = appSettings?.app_domain || Deno.env.get('SUPABASE_URL')?.replace('//', '//interviews.');

    const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        input: video.video_url,
        playback_policy: ['public'],
        cors_origin: corsOrigin,
      }),
    });

    if (!muxResponse.ok) {
      const errorText = await muxResponse.text();
      console.error('Mux API error:', errorText);

      await supabase
        .from('project_intro_videos')
        .update({
          mux_status: 'error',
          processing_error: `Mux API error: ${errorText}`
        })
        .eq('id', videoId);

      throw new Error(`Mux upload failed: ${errorText}`);
    }

    const muxData = await muxResponse.json();
    const assetId = muxData.data.id;
    const playbackId = muxData.data.playback_ids?.[0]?.id;

    const pollAssetStatus = async () => {
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const statusResponse = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
          headers: {
            'Authorization': `Basic ${basicAuth}`,
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const status = statusData.data.status;

          if (status === 'ready') {
            const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

            await supabase
              .from('project_intro_videos')
              .update({
                mux_status: 'ready',
                thumbnail_url: thumbnailUrl,
              })
              .eq('id', videoId);
            break;
          } else if (status === 'errored') {
            await supabase
              .from('project_intro_videos')
              .update({
                mux_status: 'error',
                processing_error: 'Mux processing failed',
              })
              .eq('id', videoId);
            break;
          }
        }
      }
    };

    await supabase
      .from('project_intro_videos')
      .update({
        mux_asset_id: assetId,
        mux_playback_id: playbackId,
        mux_status: 'processing',
      })
      .eq('id', videoId);

    pollAssetStatus().catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        assetId,
        playbackId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error in mux-upload-video:', error);
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