// netlify/functions/ai-chat.js
// Menggunakan Edge TTS (GRATIS, tanpa API Key!)

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Handle GET (testing)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ RAJA AI Function berjalan! Menggunakan Edge TTS (GRATIS)',
        tts_voices: {
          id: 'Daftar voice: https://github.com/rany2/edge-tts#voices',
          contoh: [
            'id-ID-GadisNeural',      // Perempuan Indonesia
            'id-ID-ArdiNeural',       // Laki-laki Indonesia
            'en-US-JennyNeural',      // Perempuan Inggris US
            'en-US-GuyNeural'         // Laki-laki Inggris US
          ]
        },
        timestamp: new Date().toISOString()
      })
    };
  }

  // Handle POST
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { action, messages, text, voiceId } = body;

      const GROQ_API_KEY = process.env.GROQ_API_KEY;

      // ========== ACTION: TEST ==========
      if (action === 'test') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'ok',
            message: 'Function is working!',
            tts: 'Edge TTS (gratis, tanpa API key)',
            groqKeyExists: !!GROQ_API_KEY
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
              error: 'GROQ_API_KEY tidak diset di environment variables Netlify!',
              solution: 'Tambahkan GROQ_API_KEY di Site Settings → Environment Variables'
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

      // ========== ACTION: TTS (Edge TTS - GRATIS!) ==========
      if (action === 'tts') {
        // Validasi input
        if (!text || typeof text !== 'string') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Text string required' })
          };
        }

        // Voice ID dengan default Indonesia
        let selectedVoice = voiceId || 'id-ID-ArdiNeural';
        
        // Mapping voice dari ElevenLabs ke Edge TTS (opsional)
        const voiceMapping = {
          'pNInz6obpgDQGcFmaJgB': 'id-ID-ArdiNeural',   // Maulana -> Ardi
          'ErXwobaYiN019PkySvjV': 'id-ID-ArdiNeural',   // Ulul -> Ardi
          'EXAVITQu4vr4xnSDxMaL': 'id-ID-GadisNeural',  // Inang -> Gadis
          'THmdRseBiCqzMsZgjN1N': 'id-ID-GadisNeural'   // Siti -> Gadis
        };
        
        // Jika pake voice ID lama, mapping ke Edge voice
        if (voiceMapping[selectedVoice]) {
          selectedVoice = voiceMapping[selectedVoice];
        }

        // Daftar voice Edge yang tersedia:
        // id-ID-ArdiNeural (laki-laki Indonesia)
        // id-ID-GadisNeural (perempuan Indonesia)
        // en-US-JennyNeural (perempuan US)
        // en-US-GuyNeural (laki-laki US)
        // en-GB-SoniaNeural (perempuan UK)
        // jp-JP-NanamiNeural (perempuan Jepang)

        try {
          // Panggil Edge TTS API (menggunakan service gratis)
          // Menggunakan API proxy dari edge-tts
          const ttsResponse = await fetch('https://edge-tts.vercel.app/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: text,
              voice: selectedVoice,
              rate: 0,      // Kecepatan bicara (-100 to 100)
              pitch: 0      // Nada bicara (-100 to 100)
            })
          });

          if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error('Edge TTS Error:', errorText);
            
            // Fallback: coba dengan voice default
            if (selectedVoice !== 'id-ID-ArdiNeural') {
              console.log('Retrying with default voice...');
              const retryResponse = await fetch('https://edge-tts.vercel.app/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: text,
                  voice: 'id-ID-ArdiNeural',
                  rate: 0,
                  pitch: 0
                })
              });
              
              if (retryResponse.ok) {
                const audioBuffer = await retryResponse.arrayBuffer();
                const base64Audio = Buffer.from(audioBuffer).toString('base64');
                return {
                  statusCode: 200,
                  headers,
                  body: JSON.stringify({ 
                    audio: base64Audio,
                    contentType: 'audio/mpeg',
                    voice: 'id-ID-ArdiNeural (fallback)'
                  })
                };
              }
            }
            
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: `Edge TTS error: ${errorText}` })
            };
          }

          const audioBuffer = await ttsResponse.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              audio: base64Audio,
              contentType: 'audio/mpeg',
              voice: selectedVoice,
              length: base64Audio.length
            })
          };
        } catch (error) {
          console.error('Edge TTS Fetch error:', error);
          
          // Fallback alternative using different service
          try {
            // Alternative TTS service (backup)
            const fallbackResponse = await fetch(`https://api.streamelements.com/kappa/v2/speech?voice=${selectedVoice}&text=${encodeURIComponent(text)}`, {
              method: 'GET'
            });
            
            if (fallbackResponse.ok) {
              const audioBuffer = await fallbackResponse.arrayBuffer();
              const base64Audio = Buffer.from(audioBuffer).toString('base64');
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  audio: base64Audio,
                  contentType: 'audio/mpeg',
                  voice: selectedVoice,
                  source: 'fallback'
                })
              };
            }
          } catch (fallbackError) {
            console.error('Fallback TTS error:', fallbackError);
          }
          
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
        body: JSON.stringify({ error: `Internal server error: ${error.message}` })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};