import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversionRequest {
  videoUrl: string;
  projectId: string;
  fileName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { videoUrl, projectId, fileName }: ConversionRequest = await req.json();

    if (!videoUrl || !projectId || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoUrl, projectId, fileName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🎬 Video conversion request:", { videoUrl, projectId, fileName });

    // Download the WebM video
    console.log("📥 Downloading video from:", videoUrl);
    const videoResponse = await fetch(videoUrl);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoSize = videoBlob.size;
    console.log("✅ Video downloaded, size:", videoSize, "bytes");

    // Check if video is already MP4
    const isWebM = fileName.toLowerCase().endsWith('.webm');
    
    if (!isWebM) {
      console.log("ℹ️ Video is already in compatible format, no conversion needed");
      return new Response(
        JSON.stringify({ 
          success: true, 
          mp4Url: videoUrl,
          converted: false,
          message: "Video already in compatible format"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For WebM files, return guidance since FFmpeg is not available in Edge Functions
    console.log("⚠️ WebM conversion requested but not supported in Edge Functions");
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "WebM to MP4 conversion requires FFmpeg which is not available in Supabase Edge Functions.",
        suggestion: "Please upload MP4 files directly or use a client-side conversion library like ffmpeg.wasm",
        videoUrl: videoUrl
      }),
      {
        status: 501, // Not Implemented
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("❌ Video conversion error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Video conversion failed", 
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});