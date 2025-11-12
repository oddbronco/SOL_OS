import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
  openai_api_key: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, model = "gpt-4o", temperature = 0.7, max_tokens = 2000, response_format, openai_api_key }: ChatRequest = await req.json();

    if (!openai_api_key) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openai_api_key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        ...(response_format && { response_format }),
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || openaiResponse.statusText;

      let userFriendlyMessage = errorMessage;
      if (openaiResponse.status === 401) {
        userFriendlyMessage = "Invalid OpenAI API key. Please check your API key in Settings.";
      } else if (openaiResponse.status === 429) {
        userFriendlyMessage = "OpenAI rate limit exceeded. Please wait a moment and try again.";
      } else if (openaiResponse.status === 403) {
        userFriendlyMessage = "OpenAI API access forbidden. Please check your API key permissions.";
      } else if (errorMessage.includes("insufficient_quota")) {
        userFriendlyMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing.";
      }

      return new Response(
        JSON.stringify({
          error: userFriendlyMessage,
          details: errorMessage,
          status: openaiResponse.status
        }),
        {
          status: openaiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await openaiResponse.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in openai-chat function:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});