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

    const { signingKeyId } = await req.json();

    if (!signingKeyId) {
      throw new Error('Missing signingKeyId parameter');
    }

    // Get user's Mux credentials and app domains
    const { data: settings } = await supabase
      .from('user_settings')
      .select('mux_token_id, mux_token_secret, app_domains')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings?.mux_token_id || !settings?.mux_token_secret) {
      throw new Error('Mux credentials not configured');
    }

    // Get app domains from settings or use defaults
    const appDomains = settings.app_domains || ['interviews.solprojectos.com', 'solprojectos.com'];
    console.log('📍 Configuring playback restrictions for domains:', appDomains);

    const basicAuth = btoa(`${settings.mux_token_id}:${settings.mux_token_secret}`);

    // Create playback restriction
    const muxResponse = await fetch('https://api.mux.com/video/v1/playback-restrictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        referrer: {
          allowed_domains: appDomains,
          allow_no_referrer: false,
        },
      }),
    });

    if (!muxResponse.ok) {
      const errorText = await muxResponse.text();
      console.error('Mux API error:', errorText);
      throw new Error(`Mux playback restriction setup failed: ${errorText}`);
    }

    const muxData = await muxResponse.json();
    const restrictionId = muxData.data.id;

    console.log('✅ Playback restriction created:', restrictionId);

    // Now associate the signing key with the playback restriction
    const updateResponse = await fetch(`https://api.mux.com/system/v1/signing-keys/${signingKeyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        playback_restriction_id: restrictionId,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to associate signing key with restriction:', errorText);
      // Don't throw - restriction was created successfully
      console.warn('⚠️ Signing key association failed, but restriction was created');
    } else {
      console.log('✅ Signing key associated with playback restriction');
    }

    return new Response(
      JSON.stringify({
        success: true,
        restrictionId,
        domains: appDomains,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error configuring Mux playback restrictions:', error);
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
