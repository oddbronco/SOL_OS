import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64Decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function pemToDer(pem: string): Uint8Array {
  const pemHeader = '-----BEGIN RSA PRIVATE KEY-----';
  const pemFooter = '-----END RSA PRIVATE KEY-----';
  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  return base64Decode(pemContents);
}

function pkcs1ToPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  const octetStringLength = pkcs1Der.length;
  const totalLength = 26 + octetStringLength;

  const pkcs8Header = new Uint8Array([
    0x30, 0x82,
    (totalLength >> 8) & 0xff,
    totalLength & 0xff,
    0x02, 0x01, 0x00,
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
    0x04, 0x82,
    (octetStringLength >> 8) & 0xff,
    octetStringLength & 0xff,
  ]);

  const result = new Uint8Array(pkcs8Header.length + pkcs1Der.length);
  result.set(pkcs8Header, 0);
  result.set(pkcs1Der, pkcs8Header.length);
  return result;
}

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

    const { playbackId } = await req.json();

    if (!playbackId) {
      throw new Error('Missing playbackId parameter');
    }

    const { data: video, error: videoError } = await supabase
      .from('project_intro_videos')
      .select('project_id, projects(customer_id)')
      .eq('mux_playback_id', playbackId)
      .maybeSingle();

    if (videoError || !video) {
      throw new Error('Video not found');
    }

    const projectCustomerId = (video.projects as any)?.customer_id;
    if (!projectCustomerId) {
      throw new Error('Project customer not found');
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('owner_id')
      .eq('customer_id', projectCustomerId)
      .maybeSingle();

    if (customerError || !customer?.owner_id) {
      throw new Error('Customer owner not found');
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('mux_signing_key_id, mux_signing_key_private')
      .eq('user_id', customer.owner_id)
      .maybeSingle();

    if (!settings?.mux_signing_key_id || !settings?.mux_signing_key_private) {
      return new Response(
        JSON.stringify({
          token: null,
          message: 'No signing key configured',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const privateKeyPem = atob(settings.mux_signing_key_private);
    const pkcs1Der = pemToDer(privateKeyPem);
    const pkcs8Der = pkcs1ToPkcs8(pkcs1Der);

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Der,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 7200;

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: settings.mux_signing_key_id,
    };

    const payload = {
      sub: playbackId,
      aud: 'v',
      exp: exp,
      kid: settings.mux_signing_key_id,
    };

    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(signingInput);
    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      data
    );

    const encodedSignature = arrayBufferToBase64url(signatureBuffer);
    const jwt = `${signingInput}.${encodedSignature}`;

    return new Response(
      JSON.stringify({
        token: jwt,
        expiresAt: exp,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error generating Mux playback token:', error);
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