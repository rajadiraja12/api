// netlify/functions/ai-chat.js
// ✅ SUDAH FIX - TANPA node-fetch, TANPA atob

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // GET - Testing
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ Function berjalan!',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version
      })
    };
  }

  // POST - Logic utama
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { action, messages, text, voiceId } = body;

      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

      // ========== ACTION: TEST ==========
      if (action === 'test') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'ok',
            groqKeyExists: !!GROQ_API_KEY,
            elevenKeyExists: !!ELEVEN_API_KEY,
            elevenKeyLength: ELEVEN_API_KEY?.length || 0
          })
        };
      }

      // ========== ACTION: CHAT ==========
      if (action === 'chat') {
        if (!GROQ_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'GROQ_API_KEY not configured',
              solution: 'Add GROQ_API_KEY in Netlify Environment Variables'
            })
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

        if (!response.ok) {
          return {
            statusCode: response.status,
            headers,
            body: JSON.stringify({ error: data.error?.message || 'Groq API error' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }

      // ========== ACTION: TTS (ElevenLabs) ==========
      if (action === 'tts') {
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'ELEVEN_LABS_KEY not configured',
              solution: 'Add ELEVEN_LABS_KEY in Netlify Environment Variables'
            })
          };
        }

        if (!text) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Text required' })
          };
        }

        // Bersihkan key (hapus spasi, newline)
        const cleanKey = ELEVEN_API_KEY.trim();

        try {
          const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'pNInz6obpgDQGcFmaJgB'}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': cleanKey
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
              body: JSON.stringify({ 
                error: 'ElevenLabs API Key invalid!',
                solution: 'Generate new API key at elevenlabs.io'
              })
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

          // ⚠️ PAKAI Buffer, BUKAN atob!
          const audioBuffer = await response.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ audio: base64Audio })
          };
        } catch (error) {
          console.error('TTS error:', error);
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: `TTS error: ${error.message}` })
          };
        }
      }

      // Unknown action
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid action',
          valid_actions: ['test', 'chat', 'tts']
        })
      };
    } catch (error) {
      console.error('Unhandled error:', error);
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