// netlify/functions/ai-chat.js
// ✅ TANPA node-fetch, pake fetch bawaan Node.js 18+

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ Function berjalan!',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
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
            groq: !!GROQ_API_KEY,
            eleven: !!ELEVEN_API_KEY,
            elevenLength: ELEVEN_API_KEY?.length || 0
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

        try {
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
        } catch (error) {
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: `Groq API error: ${error.message}` })
          };
        }
      }

      // TTS (ElevenLabs)
      if (action === 'tts') {
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'ELEVEN_LABS_KEY not set',
              solution: 'Add ELEVEN_LABS_KEY in Netlify Environment Variables'
            })
          };
        }

        if (!text || !voiceId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Text and voiceId required' })
          };
        }

        try {
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

          if (response.status === 401) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ error: 'ElevenLabs API Key invalid!' })
            };
          }

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
        } catch (error) {
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: `TTS error: ${error.message}` })
          };
        }
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    } catch (error) {
      console.error('Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: error.message,
          stack: error.stack
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};