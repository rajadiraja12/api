const fetch = require('node-fetch');

exports.handler = async (event) => {
  // CORS headers untuk semua response
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400' // Cache preflight request 24 jam
  };

  // 1. HANDLE OPTIONS (Preflight request untuk CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No content
      headers,
      body: ''
    };
  }

  // 2. HANDLE GET (Untuk testing dari browser)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ Function RAJA AI berjalan! Gunakan method POST untuk chat atau TTS.',
        instructions: {
          chat: 'POST dengan body: { "action": "chat", "messages": [...] }',
          tts: 'POST dengan body: { "action": "tts", "text": "...", "voiceId": "..." }',
          test: 'POST dengan body: { "action": "test" }'
        },
        timestamp: new Date().toISOString()
      })
    };
  }

  // 3. HANDLE POST (Logic utama)
  if (event.httpMethod === 'POST') {
    try {
      // Parse request body
      let body;
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON body' })
        };
      }

      const { action, messages, text, voiceId } = body;

      // Ambil API key dari environment variables Netlify
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

      // ========== ACTION: TEST ==========
      if (action === 'test') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'ok',
            message: 'Function is working!',
            environment: {
              groqKeyExists: !!GROQ_API_KEY,
              elevenKeyExists: !!ELEVEN_API_KEY,
              nodeVersion: process.version
            }
          })
        };
      }

      // ========== ACTION: CHAT (Groq API) ==========
      if (action === 'chat') {
        // Validasi API key
        if (!GROQ_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'GROQ_API_KEY tidak diset di environment variables Netlify!',
              solution: 'Tambahkan GROQ_API_KEY di Site Settings → Environment Variables'
            })
          };
        }

        // Validasi messages
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Messages array required' })
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
              max_tokens: 150,
              top_p: 0.95
            })
          });

          const data = await response.json();

          if (!response.ok) {
            console.error('Groq API Error:', data);
            return {
              statusCode: response.status,
              headers,
              body: JSON.stringify({ 
                error: data.error?.message || 'Groq API error',
                details: data
              })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
          };
        } catch (error) {
          console.error('Fetch error:', error);
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: `Network error: ${error.message}` })
          };
        }
      }

      // ========== ACTION: TTS (ElevenLabs API) ==========
      if (action === 'tts') {
        // Validasi API key
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'ELEVEN_LABS_KEY tidak diset di environment variables Netlify!',
              solution: 'Tambahkan ELEVEN_LABS_KEY di Site Settings → Environment Variables'
            })
          };
        }

        // Validasi input
        if (!text || typeof text !== 'string') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Text string required' })
          };
        }

        if (!voiceId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Voice ID required' })
          };
        }

        try {
          const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVEN_API_KEY
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.20,
                similarity_boost: 0.80,
                style: 0.9,
                use_speaker_boost: true
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs Error:', errorText);
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
            body: JSON.stringify({ 
              audio: base64Audio,
              contentType: 'audio/mpeg',
              length: base64Audio.length
            })
          };
        } catch (error) {
          console.error('TTS Fetch error:', error);
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: `Network error: ${error.message}` })
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
        body: JSON.stringify({ error: `Internal server error: ${error.message}` })
      };
    }
  }

  // 4. HANDLE METHOD LAINNYA (PUT, DELETE, etc)
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ 
      error: 'Method not allowed',
      allowed_methods: ['GET', 'POST', 'OPTIONS']
    })
  };
};