import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const videoPath = url.searchParams.get('path');

    if (!videoPath) {
      return new Response(
        JSON.stringify({ error: 'Missing video path parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Construct the storage URL
    const storageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${videoPath}`;
    
    console.log('Proxying video:', storageUrl);

    // Forward the request to storage with any Range headers
    const headers: Record<string, string> = {};
    const rangeHeader = req.headers.get('Range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const videoResponse = await fetch(storageUrl, { headers });

    if (!videoResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Video not found' }),
        {
          status: videoResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the video stream
    const videoStream = videoResponse.body;
    const contentType = videoResponse.headers.get('Content-Type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('Content-Length');
    const acceptRanges = videoResponse.headers.get('Accept-Ranges') || 'bytes';
    const contentRange = videoResponse.headers.get('Content-Range');

    // Build response headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Return the video stream with CORS headers
    return new Response(videoStream, {
      status: videoResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error proxying video:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
