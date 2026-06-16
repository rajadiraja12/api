// netlify/functions/ai-chat.js
// Menggunakan ElevenLabs API untuk TTS berkualitas tinggi

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

  // 2. HANDLE GET (Untuk testing)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ RAJA AI Function berjalan! Gunakan ElevenLabs TTS.',
        timestamp: new Date().toISOString()
      })
    };
  }

  // 3. HANDLE POST (Logic utama)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
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
              elevenKeyExists: !!ELEVEN_API_KEY
            }
          })
        };
      }

      // ========== ACTION: CHAT (Groq API) ==========
      if (action === 'chat') {
        // Validasi API key Groq
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
        // Validasi API key ElevenLabs
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'ELEVEN_LABS_KEY tidak diset di environment variables Netlify!',
              solution: 'Tambahkan ELEVEN_LABS_KEY di Site Settings → Environment Variables',
              note: 'Daftar di elevenlabs.io untuk mendapatkan API key'
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

        // Daftar Voice ID ElevenLabs yang tersedia:
        // Adam (pNInz6obpgDQGcFmaJgB) - American male
        // Antoni (ErXwobaYiN019PkySvjV) - British male  
        // Bella (EXAVITQu4vr4xnSDxMaL) - American female
        // Dorothy (THmdRseBiCqzMsZgjN1N) - British female
        // Rachel (21m00Tcm4TlvDq8ikWAM) - American female (populer)
        // Dominic (nPczCjzI2devNBz1zQrb) - British male

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
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.35,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs Error:', response.status, errorText);
            
            // Handle error spesifik
            if (response.status === 401) {
              return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                  error: 'ElevenLabs API Key tidak valid atau sudah habis masa berlakunya',
                  solution: 'Cek API Key di elevenlabs.io → Profile → API Key'
                })
              };
            }
            
            if (response.status === 402) {
              return {
                statusCode: 402,
                headers,
                body: JSON.stringify({ 
                  error: 'Kuota ElevenLabs habis!',
                  solution: 'Top up credit di elevenlabs.io atau coba besok lagi'
                })
              };
            }
            
            if (response.status === 429) {
              return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ 
                  error: 'Terlalu banyak request! Rate limit ElevenLabs.',
                  solution: 'Tunggu beberapa detik sebelum coba lagi'
                })
              };
            }

            return {
              statusCode: response.status,
              headers,
              body: JSON.stringify({ 
                error: `ElevenLabs API error: ${errorText}`,
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
              length: base64Audio.length,
              source: 'elevenlabs'
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
          error: `Internal server error: ${error.message}`,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
      };
    }
  }

  // 4. HANDLE METHOD LAINNYA
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ 
      error: 'Method not allowed',
      allowed_methods: ['GET', 'POST', 'OPTIONS']
    })
  };
};