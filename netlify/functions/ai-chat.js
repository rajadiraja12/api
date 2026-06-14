// netlify/functions/ai-chat.js
// Untuk Node.js 18+, fetch sudah built-in, gak perlu node-fetch!
// TAPI kalau mau pake node-fetch, install dulu

// Cara 1: Pake fetch bawaan Node.js 18+ (RECOMMENDED)
// Gak perlu install apa-apa

// Cara 2: Pake node-fetch (kalau pake Node.js versi lama)
// const fetch = require('node-fetch');

// PAKE CARA 1 (LANGSUNG) - HAPUS const fetch = require('node-fetch');

exports.handler = async (event) => {
  // CORS headers untuk semua response
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // 1. HANDLE OPTIONS (Preflight request untuk CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
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
        timestamp: new Date().toISOString()
      })
    };
  }

  // 3. HANDLE POST (Logic utama)
  if (event.httpMethod === 'POST') {
    try {
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
              elevenKeyExists: !!ELEVEN_API_KEY
            }
          })
        };
      }

      // ========== ACTION: CHAT (Groq API) ==========
      if (action === 'chat') {
        if (!GROQ_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'GROQ_API_KEY tidak diset di environment variables!'
            })
          };
        }

        if (!messages || !Array.isArray(messages)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Messages array required' })
          };
        }

        // PAKE FETCH BAWAAN (Node.js 18+)
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

      // ========== ACTION: TTS (ElevenLabs API) ==========
      if (action === 'tts') {
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'ELEVEN_LABS_KEY tidak diset di environment variables!'
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
              similarity_boost: 0.80
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
        body: JSON.stringify({ 
          error: 'Invalid action',
          valid_actions: ['test', 'chat', 'tts']
        })
      };
    } catch (error) {
      console.error('Error:', error);
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