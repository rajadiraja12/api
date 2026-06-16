// netlify/functions/ai-chat.js
// ✅ FULL VERSION - Support UUID dan sk_ format ElevenLabs

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
  // 2. OPTIONS (CORS Preflight)
  // ============================================
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // ============================================
  // 3. GET - Health Check & Debug
  // ============================================
  if (event.httpMethod === 'GET') {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

    // Cek format key
    let elevenFormat = 'unknown';
    let elevenValid = false;
    let elevenHint = '';

    if (ELEVEN_API_KEY) {
      const clean = ELEVEN_API_KEY.trim();
      const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      const skRegex = /^sk_[a-f0-9]{32,}$/i;
      
      if (uuidRegex.test(clean)) {
        elevenFormat = 'legacy_uuid';
        elevenValid = true;
        elevenHint = '✅ Legacy UUID format (valid)';
      } else if (skRegex.test(clean)) {
        elevenFormat = 'modern_sk';
        elevenValid = true;
        elevenHint = '✅ Modern sk_ format (valid)';
      } else {
        elevenFormat = 'invalid';
        elevenValid = false;
        elevenHint = clean.startsWith('sk_') ? 
          '❌ Invalid sk_ format (should be sk_ + 32+ hex chars)' : 
          '❌ Unknown format';
      }
    }

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
          eleven: {
            exists: !!ELEVEN_API_KEY,
            length: ELEVEN_API_KEY?.length || 0,
            firstChars: ELEVEN_API_KEY?.substring(0, 8) || 'N/A',
            format: elevenFormat,
            valid: elevenValid,
            hint: elevenHint
          }
        },
        supportedFormats: {
          elevenlabs: [
            'UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (legacy)',
            'sk_: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (modern)'
          ]
        },
        endpoints: {
          health: 'GET /',
          test: 'POST { "action": "test" }',
          chat: 'POST { "action": "chat", "messages": [...] }',
          tts: 'POST { "action": "tts", "text": "hello" }'
        }
      })
    };
  }

  // ============================================
  // 4. POST - Main Logic
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
      console.log(`🎯 Action: ${action}`, { 
        text: text?.substring(0, 50), 
        voiceId,
        model 
      });

      // Get API Keys
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const ELEVEN_API_KEY = process.env.ELEVEN_LABS_KEY;

      // ==========================================
      // 5. ACTION: TEST (Enhanced)
      // ==========================================
      if (action === 'test') {
        console.log('🧪 Running test action');
        
        let elevenValid = false;
        let elevenFormat = 'unknown';
        let elevenHint = '';
        let elevenSuggestion = '';

        if (ELEVEN_API_KEY) {
          const clean = ELEVEN_API_KEY.trim();
          const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
          const skRegex = /^sk_[a-f0-9]{32,}$/i;
          
          if (uuidRegex.test(clean)) {
            elevenFormat = 'legacy_uuid';
            elevenValid = true;
            elevenHint = '✅ Legacy UUID format - valid';
            elevenSuggestion = 'Works with all ElevenLabs models';
          } else if (skRegex.test(clean)) {
            elevenFormat = 'modern_sk';
            elevenValid = true;
            elevenHint = '✅ Modern sk_ format - valid';
            elevenSuggestion = 'Recommended format for new accounts';
          } else {
            elevenFormat = 'invalid';
            elevenValid = false;
            if (clean.startsWith('sk_')) {
              elevenHint = '❌ Invalid sk_ format';
              elevenSuggestion = 'Expected: sk_ + 32+ hexadecimal characters. Found: ' + clean.length + ' chars';
            } else if (clean.length === 36 && clean.includes('-')) {
              elevenHint = '❌ Invalid UUID format';
              elevenSuggestion = 'Check for typos or special characters';
            } else {
              elevenHint = '❌ Unknown format';
              elevenSuggestion = 'Key should start with either UUID format or "sk_"';
            }
          }
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
                length: GROQ_API_KEY?.length || 0,
                firstChars: GROQ_API_KEY?.substring(0, 8) || 'N/A'
              },
              eleven: {
                exists: !!ELEVEN_API_KEY,
                length: ELEVEN_API_KEY?.length || 0,
                firstChars: ELEVEN_API_KEY?.substring(0, 8) || 'N/A',
                format: elevenFormat,
                valid: elevenValid,
                hint: elevenHint,
                suggestion: elevenSuggestion
              }
            },
            supportedFormats: {
              elevenlabs: [
                {
                  format: 'Legacy (UUID)',
                  example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                  pattern: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                },
                {
                  format: 'Modern (sk_)',
                  example: 'sk_abc123def45678901234567890123456',
                  pattern: 'sk_ + 32+ hex characters'
                }
              ]
            },
            models: {
              recommended: 'eleven_turbo_v2',
              alternatives: ['eleven_multilingual_v2', 'eleven_monolingual_v1 (deprecated)']
            },
            troubleshooting: {
              ifInvalid: 'Generate new key at https://api.elevenlabs.io/app/settings/api-keys',
              ifMissing: 'Add ELEVEN_LABS_KEY in Netlify Environment Variables'
            }
          })
        };
      }

      // ==========================================
      // 6. ACTION: CHAT (Groq)
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
              solution: 'Add GROQ_API_KEY in Netlify Environment Variables'
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
                detail: data.error?.message || 'Unknown error'
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
              message: error.message
            })
          };
        }
      }

      // ==========================================
      // 7. ACTION: TTS (ElevenLabs) - SUPPORT 2 FORMATS
      // ==========================================
      if (action === 'tts') {
        console.log('🔊 Processing TTS request');
        
        // Validasi ElevenLabs API Key
        if (!ELEVEN_API_KEY) {
          console.error('❌ ELEVEN_LABS_KEY missing');
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'ELEVEN_LABS_KEY not configured',
              solution: 'Add ELEVEN_LABS_KEY in Netlify Environment Variables'
            })
          };
        }

        // Clean API Key
        const cleanKey = ELEVEN_API_KEY.trim();
        console.log(`🔑 ElevenLabs Key: ${cleanKey.substring(0, 8)}... (${cleanKey.length} chars)`);

        // 🔥 VALIDASI SUPPORT 2 FORMAT
        const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        const skRegex = /^sk_[a-f0-9]{32,}$/i;
        
        const isLegacyUuid = uuidRegex.test(cleanKey);
        const isModernSk = skRegex.test(cleanKey);
        const isValidFormat = isLegacyUuid || isModernSk;

        if (!isValidFormat) {
          console.warn('⚠️ Invalid key format:', {
            isLegacyUuid,
            isModernSk,
            startsWith: cleanKey.substring(0, 3)
          });

          let hint = '';
          if (cleanKey.startsWith('sk_')) {
            hint = 'Your key starts with "sk_" but format is invalid. Should be sk_ + 32+ hex characters.';
          } else if (cleanKey.length === 36 && cleanKey.includes('-')) {
            hint = 'Your key looks like UUID but format is invalid. Check for typos.';
          } else {
            hint = 'Key format not recognized. Must be either UUID or sk_ format.';
          }

          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Invalid ElevenLabs API Key format',
              hint: hint,
              acceptedFormats: [
                {
                  type: 'Legacy UUID',
                  format: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                  example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
                },
                {
                  type: 'Modern sk_',
                  format: 'sk_ + 32+ hexadecimal characters',
                  example: 'sk_abc123def45678901234567890123456'
                }
              ],
              yourKey: {
                firstChars: cleanKey.substring(0, 8),
                length: cleanKey.length,
                startsWith: cleanKey.substring(0, 3),
                isLegacyUuid: isLegacyUuid,
                isModernSk: isModernSk
              },
              howToFix: 'Generate new key at https://api.elevenlabs.io/app/settings/api-keys'
            })
          };
        }

        // Validasi text
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

        // Limit text
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

        // Voice ID & Model
        const voiceIdToUse = voiceId || 'pNInz6obpgDQGcFmaJgB';
        
        // 🔥 PAKAI MODEL TERBARU
        const modelId = model || 'eleven_turbo_v2';
        console.log(`🎤 Voice: ${voiceIdToUse}, Model: ${modelId}, Format: ${isModernSk ? 'sk_' : 'UUID'}`);

        try {
          // Set timeout
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
                model_id: modelId,
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75
                }
              }),
              signal: controller.signal
            }
          );

          clearTimeout(timeoutId);

          // Log response
          console.log(`📡 ElevenLabs Response: ${response.status} ${response.statusText}`);

          // 🔥 HANDLE 401 KHUSUS
          if (response.status === 401) {
            let errorText = 'Authentication failed';
            try {
              const errorJson = await response.json();
              errorText = JSON.stringify(errorJson);
            } catch (e) {
              errorText = await response.text();
            }

            console.error('🔴 401 Error:', errorText);

            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                error: 'ElevenLabs authentication failed',
                detail: errorText,
                keyInfo: {
                  firstChars: cleanKey.substring(0, 8),
                  length: cleanKey.length,
                  format: isModernSk ? 'Modern sk_ format' : 'Legacy UUID format',
                  validFormat: isValidFormat
                },
                troubleshooting: [
                  '1. Verify your API key is correct',
                  '2. Check if your ElevenLabs account has credits',
                  '3. Ensure your account is active and not expired',
                  '4. Try generating a new key at elevenlabs.io'
                ],
                model: modelId,
                voiceId: voiceIdToUse
              })
            };
          }

          // Handle other errors
          if (!response.ok) {
            let errorText = 'Unknown error';
            try {
              const errorJson = await response.json();
              errorText = JSON.stringify(errorJson);
            } catch (e) {
              errorText = await response.text();
            }

            console.error(`⚠️ ElevenLabs Error ${response.status}:`, errorText);

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
              model: modelId,
              voiceId: voiceIdToUse,
              textLength: text.length,
              keyFormat: isModernSk ? 'modern_sk' : 'legacy_uuid'
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
                message: 'Request exceeded 30 second limit'
              })
            };
          }

          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return {
              statusCode: 503,
              headers,
              body: JSON.stringify({
                error: 'Cannot reach ElevenLabs API',
                message: 'Network error or service unavailable'
              })
            };
          }

          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
              error: 'TTS processing failed',
              message: error.message,
              type: error.name
            })
          };
        }
      }

      // ==========================================
      // 8. UNKNOWN ACTION
      // ==========================================
      console.warn(`⚠️ Unknown action: ${action}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid action',
          valid_actions: ['test', 'chat', 'tts'],
          received: action,
          examples: {
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
              voiceId: 'optional',
              model: 'eleven_turbo_v2'
            }
          }
        })
      };

    } catch (error) {
      // ==========================================
      // 9. UNHANDLED ERROR
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
          type: error.name
        })
      };
    }
  }

  // ============================================
  // 10. METHOD NOT ALLOWED
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