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

    const { assetId } = await req.json();

    if (!assetId) {
      throw new Error('Missing assetId parameter');
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('mux_token_id, mux_token_secret')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings?.mux_token_id || !settings?.mux_token_secret) {
      throw new Error('Mux credentials not configured');
    }

    const basicAuth = btoa(`${settings.mux_token_id}:${settings.mux_token_secret}`);

    console.log('🔄 Updating Mux asset to public:', assetId);

    const muxResponse = await fetch(`https://api.mux.com/video/v1/assets/${assetId}/playback-ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        policy: 'public',
      }),
    });

    if (!muxResponse.ok) {
      const errorText = await muxResponse.text();
      console.error('Mux API error:', errorText);
      throw new Error(`Mux update failed: ${errorText}`);
    }

    const muxData = await muxResponse.json();
    console.log('✅ Created public playback ID:', muxData);

    return new Response(
      JSON.stringify({
        success: true,
        data: muxData,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error in update-mux-asset-to-public:', error);
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