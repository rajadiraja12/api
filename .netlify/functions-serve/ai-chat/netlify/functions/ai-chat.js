// netlify/functions/ai-chat.js
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "ok",
        message: "\u2705 Function RAJA AI berjalan! Gunakan method POST untuk chat atau TTS.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      })
    };
  }
  if (event.httpMethod === "POST") {
    try {
      let body;
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid JSON body" })
        };
      }
      const { action, messages, text, voiceId } = body;
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;
      if (action === "test") {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: "ok",
            message: "Function is working!",
            environment: {
              groqKeyExists: !!GROQ_API_KEY,
              elevenKeyExists: !!ELEVEN_API_KEY
            }
          })
        };
      }
      if (action === "chat") {
        if (!GROQ_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: "GROQ_API_KEY tidak diset di environment variables!"
            })
          };
        }
        if (!messages || !Array.isArray(messages)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Messages array required" })
          };
        }
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 1.4,
            max_tokens: 150
          })
        });
        const data = await response.json();
        if (!response.ok) {
          return {
            statusCode: response.status,
            headers,
            body: JSON.stringify({ error: data.error?.message || "Groq API error" })
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }
      if (action === "tts") {
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: "ELEVEN_LABS_KEY tidak diset di environment variables!"
            })
          };
        }
        if (!text || !voiceId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Text and voiceId required" })
          };
        }
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVEN_API_KEY
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.2,
              similarity_boost: 0.8
            }
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          return {
            statusCode: response.status,
            headers,
            body: JSON.stringify({ error: `ElevenLabs error: ${errorText}` })
          };
        }
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ audio: base64Audio })
        };
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid action",
          valid_actions: ["test", "chat", "tts"]
        })
      };
    } catch (error) {
      console.error("Error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" })
  };
};
//# sourceMappingURL=ai-chat.js.map
