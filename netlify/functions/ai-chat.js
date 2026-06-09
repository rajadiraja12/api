const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, messages, text, voiceId } = body;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

    // TEST action buat cek koneksi
    if (action === 'test') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok', message: 'Server is running' })
      };
    }

    if (action === 'chat') {
      if (!GROQ_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'GROQ_API_KEY not set in environment variables!' })
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
          max_tokens: 150,
          top_p: 0.95
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

    if (action === 'tts') {
      if (!ELEVEN_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'ELEVEN_LABS_KEY not set in environment variables!' })
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
            similarity_boost: 0.80,
            style: 0.9,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: `ElevenLabs error: ${error}` })
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
      body: JSON.stringify({ error: 'Invalid action. Use "chat", "tts", or "test"' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};