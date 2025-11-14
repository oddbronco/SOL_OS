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
  let pemContents = pem;

  pemContents = pemContents
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  return base64Decode(pemContents);
}

function pkcs1ToPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  const oidSequence = new Uint8Array([
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00
  ]);

  const octetStringLength = pkcs1Der.length > 127 ? 4 : 2;
  const innerLength = 3 + oidSequence.length + octetStringLength + pkcs1Der.length;
  const outerLengthBytes = innerLength > 127 ? 3 : 1;

  const totalLength = 1 + outerLengthBytes + innerLength;
  const pkcs8Der = new Uint8Array(totalLength);

  let offset = 0;

  pkcs8Der[offset++] = 0x30;

  if (innerLength > 127) {
    pkcs8Der[offset++] = 0x82;
    pkcs8Der[offset++] = (innerLength >> 8) & 0xff;
    pkcs8Der[offset++] = innerLength & 0xff;
  } else {
    pkcs8Der[offset++] = innerLength;
  }

  pkcs8Der[offset++] = 0x02;
  pkcs8Der[offset++] = 0x01;
  pkcs8Der[offset++] = 0x00;

  pkcs8Der.set(oidSequence, offset);
  offset += oidSequence.length;

  pkcs8Der[offset++] = 0x04;

  if (pkcs1Der.length > 127) {
    pkcs8Der[offset++] = 0x82;
    pkcs8Der[offset++] = (pkcs1Der.length >> 8) & 0xff;
    pkcs8Der[offset++] = pkcs1Der.length & 0xff;
  } else {
    pkcs8Der[offset++] = pkcs1Der.length;
  }

  pkcs8Der.set(pkcs1Der, offset);

  return pkcs8Der;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  console.log('🎬 Mux playback token request received');
  console.log('📋 Request method:', req.method);
  console.log('🌐 Request origin:', req.headers.get('origin'));

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    console.log('📦 Request body:', body);
    const { playbackId } = body;

    if (!playbackId) {
      console.error('❌ Missing playbackId in request');
      throw new Error('Missing playbackId parameter');
    }

    console.log('🔍 Looking up video with playbackId:', playbackId);

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

    console.log('🔍 Looking up customer:', projectCustomerId);

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('owner_id')
      .eq('customer_id', projectCustomerId)
      .maybeSingle();

    console.log('👤 Customer lookup result:', { customer, customerError });

    if (customerError) {
      console.error('❌ Customer query error:', customerError);
      throw new Error(`Customer query failed: ${customerError.message}`);
    }

    if (!customer?.owner_id) {
      console.error('❌ Customer found but no owner_id:', customer);
      throw new Error('Customer owner not found');
    }

    console.log('✅ Found customer owner:', customer.owner_id);

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

    let privateKeyPem = atob(settings.mux_signing_key_private);

    if (!privateKeyPem.includes('\n') && privateKeyPem.includes('-----BEGIN')) {
      privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
    }

    const isPKCS1 = privateKeyPem.includes('RSA PRIVATE KEY');
    const isPKCS8 = privateKeyPem.includes('PRIVATE KEY') && !isPKCS1;

    console.log('🔑 Private key format check:', {
      hasNewlines: privateKeyPem.includes('\n'),
      length: privateKeyPem.length,
      startsWithBegin: privateKeyPem.startsWith('-----BEGIN'),
      keyType: isPKCS1 ? 'PKCS#1' : isPKCS8 ? 'PKCS#8' : 'unknown'
    });

    let der = pemToDer(privateKeyPem);

    if (isPKCS1) {
      console.log('🔄 Converting PKCS#1 to PKCS#8');
      der = pkcs1ToPkcs8(der);
    }

    console.log('📦 DER conversion:', {
      derLength: der.length,
      expectedApprox: '~1200-1300 bytes for RSA-2048',
      firstByte: der[0],
      secondByte: der[1]
    });

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      der,
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

    console.log('✅ JWT generated successfully');

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
    console.error('❌ Error generating Mux playback token:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack,
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