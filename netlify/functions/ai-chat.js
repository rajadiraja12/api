// netlify/functions/ai-chat.js
<<<<<<< HEAD
// PASTIKAN FILE INI ADA DI netlify/functions/ai-chat.js
=======
// Dengan debug lengkap untuk cek masalah 401
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

<<<<<<< HEAD
  // OPTIONS
=======
  // ========== DEBUG ENV ==========
  console.log("=== ENV CHECK ===");
  console.log("GROQ_KEY:", process.env.GROQ_API_KEY ? `✅ Ada (${process.env.GROQ_API_KEY.length} chars)` : '❌ TIDAK ADA');
  console.log("ELEVEN_KEY:", process.env.ELEVEN_LABS_KEY ? `✅ Ada (${process.env.ELEVEN_LABS_KEY.length} chars)` : '❌ TIDAK ADA');
  console.log("ELEVEN_KEY first 10:", process.env.ELEVEN_LABS_KEY?.substring(0, 10) || 'null');
  
  // ========== CORS ==========
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

<<<<<<< HEAD
  // GET - Cek function jalan
=======
  // ========== GET ==========
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
<<<<<<< HEAD
        message: '✅ Function ditemukan dan berjalan!',
        timestamp: new Date().toISOString(),
        path: event.path,
        httpMethod: event.httpMethod
=======
        message: 'RAJA AI Function',
        envVars: {
          groq: !!process.env.GROQ_API_KEY,
          eleven: !!process.env.ELEVEN_LABS_KEY,
          elevenLength: process.env.ELEVEN_LABS_KEY?.length || 0
        }
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
      })
    };
  }

<<<<<<< HEAD
  // POST
=======
  // ========== POST ==========
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
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
<<<<<<< HEAD
            elevenKeyExists: !!ELEVEN_API_KEY,
            elevenKeyLength: ELEVEN_API_KEY?.length || 0,
            groqKeyExists: !!GROQ_API_KEY
=======
            message: 'Function is working!',
            environment: {
              groqKeyExists: !!GROQ_API_KEY,
              groqKeyLength: GROQ_API_KEY?.length || 0,
              elevenKeyExists: !!ELEVEN_API_KEY,
              elevenKeyLength: ELEVEN_API_KEY?.length || 0,
              elevenKeyFirst10: ELEVEN_API_KEY?.substring(0, 10) || 'null'
            }
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
          })
        };
      }

<<<<<<< HEAD
      // CHAT
=======
      // ========== ACTION: CHAT ==========
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
      if (action === 'chat') {
        if (!GROQ_API_KEY) {
          return {
            statusCode: 500,
            headers,
<<<<<<< HEAD
            body: JSON.stringify({ error: 'GROQ_API_KEY not set' })
=======
            body: JSON.stringify({ 
              error: 'GROQ_API_KEY tidak diset',
              solution: 'Tambahkan GROQ_API_KEY di Netlify Environment Variables'
            })
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
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
<<<<<<< HEAD

        const data = await response.json();
        return { statusCode: response.status, headers, body: JSON.stringify(data) };
      }

      // TTS
      if (action === 'tts') {
=======

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
        // CEK API KEY ELEVENLABS
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
        if (!ELEVEN_API_KEY) {
          console.error("❌ ELEVEN_LABS_KEY TIDAK DITEMUKAN!");
          return {
            statusCode: 500,
            headers,
<<<<<<< HEAD
            body: JSON.stringify({ error: 'ELEVEN_LABS_KEY not set' })
          };
        }

        if (!text || !voiceId) {
=======
            body: JSON.stringify({ 
              error: 'ELEVEN_LABS_KEY tidak diset di environment variables!',
              solution: 'Tambahkan ELEVEN_LABS_KEY di Netlify Environment Variables',
              steps: [
                '1. Buka app.netlify.com',
                '2. Pilih site kamu',
                '3. Site settings → Environment variables',
                '4. Tambah ELEVEN_LABS_KEY = sk_xxxxxxxx',
                '5. Redeploy site'
              ]
            })
          };
        }

        // CEK FORMAT API KEY (harus dimulai dengan 'sk_')
        if (!ELEVEN_API_KEY.startsWith('sk_')) {
          console.error(`❌ ELEVEN_LABS_KEY format salah: ${ELEVEN_API_KEY.substring(0, 10)}...`);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Format ELEVEN_LABS_KEY salah!',
              solution: 'API Key harus dimulai dengan "sk_"',
              currentKey: `${ELEVEN_API_KEY.substring(0, 10)}...`
            })
          };
        }

        if (!text || typeof text !== 'string') {
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
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

<<<<<<< HEAD
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ audio: base64Audio })
        };
=======
        console.log(`🎤 Calling ElevenLabs with voice: ${voiceId}, text length: ${text.length}`);

        try {
          const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVEN_API_KEY.trim() // Trim biar gak ada spasi
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.35,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
              }
            })
          });

          console.log(`ElevenLabs response status: ${response.status}`);

          // HANDLE 401 KHUSUS
          if (response.status === 401) {
            const errorText = await response.text();
            console.error('❌ ELEVENLABS 401 ERROR:', errorText);
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ 
                error: 'API Key ElevenLabs tidak valid!',
                detail: errorText,
                solution: 'Generate ulang API Key di elevenlabs.io → Profile → API Key',
                currentKey: `${ELEVEN_API_KEY.substring(0, 10)}...${ELEVEN_API_KEY.substring(ELEVEN_API_KEY.length - 5)}`
              })
            };
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs Error:', response.status, errorText);
            return {
              statusCode: response.status,
              headers,
              body: JSON.stringify({ 
                error: `ElevenLabs error: ${errorText}`,
                status: response.status
              })
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
              voiceId: voiceId,
              length: base64Audio.length
            })
          };
        } catch (error) {
          console.error('ElevenLabs Fetch error:', error);
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ 
              error: `Network error: ${error.message}`,
              solution: 'Cek koneksi internet atau coba lagi nanti'
            })
          };
        }
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
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
<<<<<<< HEAD
        body: JSON.stringify({ error: error.message })
=======
        body: JSON.stringify({ error: `Internal server error: ${error.message}` })
>>>>>>> 2181bd39ec82f97b96c9dcd0a8a4eddbeebc2a97
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
