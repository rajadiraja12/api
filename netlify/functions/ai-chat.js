// netlify/functions/ai-chat.js
// ✅ FULL VERSION - Dengan Debugging Lengkap

exports.handler = async (event) => {
  // ============================================
  // 1. CORS HEADERS
  // ============================================
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, xi-api-key, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // ============================================
  // 2. LOG REQUEST (Debugging)
  // ============================================
  console.log('📥 Incoming Request:', {
    method: event.httpMethod,
    path: event.path,
    headers: {
      'content-type': event.headers['content-type'],
      'authorization': event.headers.authorization ? 'Bearer [hidden]' : 'none'
    },
    body: event.body ? 'present' : 'empty'
  });

  // ============================================
  // 3. OPTIONS (CORS Preflight)
  // ============================================
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // ============================================
  // 4. GET - Testing & Health Check
  // ============================================
  if (event.httpMethod === 'GET') {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: '✅ AI Chat Function Running!',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: {
          groq: GROQ_API_KEY ? '✅ configured' : '❌ missing',
          eleven: ELEVEN_API_KEY ? `✅ configured (${ELEVEN_API_KEY.length} chars)` : '❌ missing',
          elevenFirstChars: ELEVEN_API_KEY ? ELEVEN_API_KEY.substring(0, 8) : 'N/A'
        },
        endpoints: {
          test: 'POST { "action": "test" }',
          chat: 'POST { "action": "chat", "messages": [...] }',
          tts: 'POST { "action": "tts", "text": "hello" }'
        }
      })
    };
  }

  // ============================================
  // 5. POST - Main Logic
  // ============================================
  if (event.httpMethod === 'POST') {
    try {
      // Parse body
      let body;
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON body',
            detail: parseError.message
          })
        };
      }

      const { action, messages, text, voiceId, model } = body;
      console.log(`🎯 Action: ${action}`, { text: text?.substring(0, 50), voiceId });

      // Get API Keys
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

      // ==========================================
      // 6. ACTION: TEST
      // ==========================================
      if (action === 'test') {
        console.log('🧪 Running test action');
        
        // Test ElevenLabs key format
        let elevenValid = false;
        let elevenFormat = 'unknown';
        if (ELEVEN_API_KEY) {
          const clean = ELEVEN_API_KEY.trim();
          const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
          elevenValid = uuidRegex.test(clean);
          elevenFormat = elevenValid ? 'valid_uuid' : 'invalid_format';
        }

        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'ok',
            action: 'test',
            timestamp: new Date().toISOString(),
            keys: {
              groq: {
                exists: !!GROQ_API_KEY,
                length: GROQ_API_KEY?.length || 0
              },
              eleven: {
                exists: !!ELEVEN_API_KEY,
                length: ELEVEN_API_KEY?.length || 0,
                firstChars: ELEVEN_API_KEY?.substring(0, 8) || 'N/A',
                format: elevenFormat,
                valid: elevenValid
              }
            },
            environment: {
              nodeVersion: process.version,
              platform: process.platform,
              envKeys: Object.keys(process.env).filter(k => 
                k.includes('KEY') || k.includes('API') || k.includes('TOKEN')
              )
            },
            suggestions: {
              ifKeysMissing: 'Add GROQ_API_KEY and ELEVEN_LABS_KEY in Netlify Environment Variables',
              ifElevenInvalid: 'Generate new API key at https://api.elevenlabs.io/app/settings/api-keys',
              ifGroqMissing: 'Get API key at https://console.groq.com/keys'
            }
          })
        };
      }

      // ==========================================
      // 7. ACTION: CHAT (Groq)
      // ==========================================
      if (action === 'chat') {
        console.log('💬 Processing chat request');
        
        if (!GROQ_API_KEY) {
          console.error('❌ GROQ_API_KEY missing');
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'GROQ_API_KEY not configured',
              solution: 'Add GROQ_API_KEY in Netlify Environment Variables',
              action: 'chat'
            })
          };
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Messages array required',
              example: {
                messages: [
                  { role: 'system', content: 'You are a helpful assistant.' },
                  { role: 'user', content: 'Hello!' }
                ]
              }
            })
          };
        }

        try {
          const groqModel = model || 'llama-3.3-70b-versatile';
          console.log(`📡 Calling Groq API with model: ${groqModel}`);

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: groqModel,
              messages: messages,
              temperature: 1.4,
              max_tokens: 150
            })
          });

          console.log(`📡 Groq Response Status: ${response.status}`);

          const data = await response.json();

          if (!response.ok) {
            console.error('❌ Groq API Error:', data);
            return {
              statusCode: response.status,
              headers,
              body: JSON.stringify({
                error: 'Groq API error',
                detail: data.error?.message || 'Unknown error',
                status: response.status
              })
            };
          }

          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          };

        } catch (error) {
          console.error('💥 Groq Request Failed:', error);
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
              error: 'Failed to reach Groq API',
              message: error.message,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
          };
        }
      }

      // ==========================================
      // 8. ACTION: TTS (ElevenLabs)
      // ==========================================
      if (action === 'tts') {
        console.log('🔊 Processing TTS request');
        
        // Validate ElevenLabs API Key
        if (!ELEVEN_API_KEY) {
          console.error('❌ ELEVEN_LABS_KEY missing');
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'ELEVEN_LABS_KEY not configured',
              solution: 'Add ELEVEN_LABS_KEY in Netlify Environment Variables',
              debug: {
                keysFound: Object.keys(process.env).filter(k => 
                  k.toLowerCase().includes('eleven') || k.toLowerCase().includes('labs')
                )
              }
            })
          };
        }

        // Clean API Key
        const cleanKey = ELEVEN_API_KEY.trim();
        console.log(`🔑 ElevenLabs Key: ${cleanKey.substring(0, 8)}... (${cleanKey.length} chars)`);

        // Validate key format
        const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        const isValidFormat = uuidRegex.test(cleanKey);
        
        if (!isValidFormat) {
          console.warn('⚠️ ElevenLabs key format looks invalid:', cleanKey.substring(0, 8));
        }

        // Validate text
        if (!text) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Text required for TTS',
              example: { action: 'tts', text: 'Hello world' }
            })
          };
        }

        // Limit text length
        if (text.length > 5000) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Text too long',
              maxLength: 5000,
              currentLength: text.length
            })
          };
        }

        const voiceIdToUse = voiceId || 'pNInz6obpgDQGcFmaJgB';
        console.log(`🎤 Using voice: ${voiceIdToUse}`);

        try {
          // Set timeout for fetch
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn('⏰ TTS request timeout, aborting...');
            controller.abort();
          }, 30000);

          console.log('📡 Calling ElevenLabs API...');
          
          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceIdToUse}`,
            {
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
              }),
              signal: controller.signal
            }
          );

          clearTimeout(timeoutId);

          // Log response details
          console.log(`📡 ElevenLabs Response: ${response.status} ${response.statusText}`);
          console.log('📡 Response Headers:', {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length'),
            'x-request-id': response.headers.get('x-request-id')
          });

          // Handle 401 specifically
          if (response.status === 401) {
            let errorText = 'Could not parse error response';
            try {
              errorText = await response.text();
              console.error('🔴 401 Error Body:', errorText);
            } catch (e) {
              console.error('🔴 Could not read 401 error body');
            }

            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                error: 'ElevenLabs API Key invalid or expired',
                detail: errorText,
                solution: 'Generate new API key at https://api.elevenlabs.io/app/settings/api-keys',
                keyInfo: {
                  length: cleanKey.length,
                  firstChars: cleanKey.substring(0, 8),
                  format: isValidFormat ? 'UUID format' : 'Unknown format (expected UUID)',
                  isValidFormat: isValidFormat
                },
                troubleshooting: [
                  '1. Generate new key at elevenlabs.io',
                  '2. Update ELEVEN_LABS_KEY in Netlify Environment Variables',
                  '3. Redeploy the function',
                  '4. Test with action: "test" first'
                ]
              })
            };
          }

          // Handle other errors
          if (!response.ok) {
            let errorText = 'Could not parse error response';
            try {
              errorText = await response.text();
              console.error(`⚠️ ElevenLabs Error ${response.status}:`, errorText);
            } catch (e) {
              console.error(`⚠️ Could not read error body for status ${response.status}`);
            }

            return {
              statusCode: response.status,
              headers,
              body: JSON.stringify({
                error: `ElevenLabs API error: ${response.status}`,
                detail: errorText,
                status: response.status,
                statusText: response.statusText
              })
            };
          }

          // Process audio response
          console.log('🎵 Processing audio response...');
          const audioBuffer = await response.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          
          console.log(`✅ TTS Success: ${audioBuffer.byteLength} bytes audio`);

          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: base64Audio,
              size: audioBuffer.byteLength,
              format: 'mp3',
              voiceId: voiceIdToUse,
              textLength: text.length
            })
          };

        } catch (error) {
          console.error('💥 TTS Fatal Error:', error);
          
          if (error.name === 'AbortError') {
            return {
              statusCode: 504,
              headers,
              body: JSON.stringify({
                error: 'TTS request timeout',
                message: 'Request exceeded 30 second limit',
                suggestion: 'Try shorter text or check ElevenLabs service status'
              })
            };
          }

          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return {
              statusCode: 503,
              headers,
              body: JSON.stringify({
                error: 'Cannot reach ElevenLabs API',
                message: 'Network error or service unavailable',
                detail: error.message
              })
            };
          }

          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
              error: 'TTS processing failed',
              message: error.message,
              type: error.name,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
          };
        }
      }

      // ==========================================
      // 9. UNKNOWN ACTION
      // ==========================================
      console.warn(`⚠️ Unknown action: ${action}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid action',
          valid_actions: ['test', 'chat', 'tts'],
          received: action,
          example: {
            test: { action: 'test' },
            chat: { 
              action: 'chat', 
              messages: [
                { role: 'user', content: 'Hello' }
              ]
            },
            tts: { 
              action: 'tts', 
              text: 'Hello world',
              voiceId: 'optional'
            }
          }
        })
      };

    } catch (error) {
      // ==========================================
      // 10. UNHANDLED ERROR
      // ==========================================
      console.error('💥 Unhandled exception:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Internal server error',
          message: error.message,
          type: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
      };
    }
  }

  // ============================================
  // 11. METHOD NOT ALLOWED
  // ============================================
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({
      error: 'Method not allowed',
      allowed: ['GET', 'POST', 'OPTIONS']
    })
  };
};