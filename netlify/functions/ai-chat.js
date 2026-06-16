// netlify/functions/ai-chat.js
// PASTIKAN FILE INI ADA DI netlify/functions/ai-chat.js

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // GET - Cek function jalan
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ Function ditemukan dan berjalan!',
        timestamp: new Date().toISOString(),
        path: event.path,
        httpMethod: event.httpMethod
      })
    };
  }

  // POST
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { action, messages, text, voiceId } = body;

      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

      // TEST
      if (action === 'test') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'ok',
            elevenKeyExists: !!ELEVEN_API_KEY,
            elevenKeyLength: ELEVEN_API_KEY?.length || 0,
            groqKeyExists: !!GROQ_API_KEY
          })
        };
      }

      // CHAT
      if (action === 'chat') {
        if (!GROQ_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'GROQ_API_KEY not set' })
          };
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 1.4,
            max_tokens: 150
          })
        });

        const data = await response.json();
        return { statusCode: response.status, headers, body: JSON.stringify(data) };
      }

      // TTS
      if (action === 'tts') {
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'ELEVEN_LABS_KEY not set' })
          };
        }

        if (!text || !voiceId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Text and voiceId required' })
          };
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVEN_API_KEY.trim()
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.35,
              similarity_boost: 0.75
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
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ audio: base64Audio })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    } catch (error) {
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
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};