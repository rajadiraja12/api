// netlify/functions/ai-chat.js
// Menggunakan Edge TTS dengan endpoint yang WORKING

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ RAJA AI Function berjalan! Edge TTS (GRATIS)',
        tts_status: 'Using working Edge TTS endpoint'
      })
    };
  }

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
              error: 'GROQ_API_KEY tidak diset di environment variables Netlify!'
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

      // ========== ACTION: TTS (Edge TTS - WORKING ENDPOINT) ==========
      if (action === 'tts') {
        if (!text || typeof text !== 'string') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Text string required' })
          };
        }

        // Voice mapping
        let selectedVoice = voiceId || 'id-ID-ArdiNeural';
        
        // ENDPOINT YANG WORKING (alternatif)
        // Menggunakan API dari https://github.com/rany2/edge-tts
        
        const encText = encodeURIComponent(text);
        
        // Coba endpoint pertama (paling stabil)
        let ttsUrl = `https://edge-tts.vercel.app/tts?text=${encText}&voice=${selectedVoice}&rate=0&pitch=0`;
        
        try {
          console.log(`Trying Edge TTS with voice: ${selectedVoice}`);
          
          const ttsResponse = await fetch(ttsUrl, {
            method: 'GET',
            headers: {
              'Accept': 'audio/mpeg'
            }
          });

          if (!ttsResponse.ok) {
            // Coba endpoint kedua (backup)
            console.log('First endpoint failed, trying backup...');
            const backupUrl = `https://edge-tts-api.vercel.app/api/tts?text=${encText}&voice=${selectedVoice}`;
            
            const backupResponse = await fetch(backupUrl, {
              method: 'GET',
              headers: { 'Accept': 'audio/mpeg' }
            });
            
            if (!backupResponse.ok) {
              // Coba endpoint ketiga (StreamElements - alternative)
              console.log('Second endpoint failed, trying StreamElements...');
              const streamElementsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${selectedVoice}&text=${encText}`;
              
              const seResponse = await fetch(streamElementsUrl, {
                method: 'GET',
                headers: { 'Accept': 'audio/mpeg' }
              });
              
              if (!seResponse.ok) {
                throw new Error(`All TTS endpoints failed. Status: ${seResponse.status}`);
              }
              
              const audioBuffer = await seResponse.arrayBuffer();
              const base64Audio = Buffer.from(audioBuffer).toString('base64');
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  audio: base64Audio,
                  contentType: 'audio/mpeg',
                  voice: selectedVoice,
                  source: 'streamelements'
                })
              };
            }
            
            const audioBuffer = await backupResponse.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ 
                audio: base64Audio,
                contentType: 'audio/mpeg',
                voice: selectedVoice,
                source: 'edge-tts-api'
              })
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
              source: 'edge-tts-vercel'
            })
          };
          
        } catch (error) {
          console.error('Edge TTS Error:', error);
          
          // LAST RESORT: Pake Browser Speech API (client-side)
          // Kirim sinyal ke client untuk pake browser TTS
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              useBrowserTTS: true,
              text: text,
              voice: selectedVoice,
              message: 'Server TTS error, using browser fallback'
            })
          };
        }
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