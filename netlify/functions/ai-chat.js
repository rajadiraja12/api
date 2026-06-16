// netlify/functions/ai-chat.js
// VERSI FINAL - SUDAH TESTED

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

  // GET - Testing
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: 'RAJA AI Function is running!',
        env: {
          groq: !!process.env.GROQ_API_KEY,
          eleven: !!process.env.ELEVEN_LABS_KEY,
          elevenLength: process.env.ELEVEN_LABS_KEY?.length || 0
        }
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

      // ========== ACTION: TEST ==========
      if (action === 'test') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'ok',
            elevenKeyExists: !!ELEVEN_API_KEY,
            elevenKeyLength: ELEVEN_API_KEY?.length || 0,
            elevenKeyFirst5: ELEVEN_API_KEY?.substring(0, 5) || 'null',
            groqKeyExists: !!GROQ_API_KEY
          })
        };
      }

      // ========== ACTION: CHAT ==========
      if (action === 'chat') {
        if (!GROQ_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'GROQ_API_KEY not configured' })
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

      // ========== ACTION: TTS (ElevenLabs) ==========
      if (action === 'tts') {
        if (!ELEVEN_API_KEY) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'ELEVEN_LABS_KEY not configured in Netlify',
              solution: 'Add ELEVEN_LABS_KEY in Site Settings → Environment Variables'
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

        // PASTIKAN VOICE ID VALID
        const validVoiceIds = [
          'pNInz6obpgDQGcFmaJgB', // Adam
          'ErXwobaYiN019PkySvjV', // Antoni
          'EXAVITQu4vr4xnSDxMaL', // Bella
          'THmdRseBiCqzMsZgjN1N'  // Dorothy
        ];

        let finalVoiceId = voiceId;
        if (!validVoiceIds.includes(voiceId)) {
          finalVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Default Adam
        }

        console.log(`🎤 Calling ElevenLabs with voice: ${finalVoiceId}`);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`, {
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

        console.log(`ElevenLabs response status: ${response.status}`);

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

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            audio: base64Audio,
            voiceId: finalVoiceId
          })
        };
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