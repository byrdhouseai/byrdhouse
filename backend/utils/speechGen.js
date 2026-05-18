// =============================================================================
// Text-to-Speech via MiniMax Speech API
// =============================================================================

const axios = require('axios');

/**
 * Generate speech using MiniMax TTS API
 * Falls back to browser Web Speech API guidance if no API key
 */
async function generateSpeech(text, voice_id = null, speed = 1.0, voice_url = null) {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_API_BASE = process.env.MINIMAX_API_BASE || 'https://api.minimax.chat/v1';

  if (!MINIMAX_API_KEY) {
    return {
      audioUrl: null,
      status: 'demo',
      message: 'Configure MINIMAX_API_KEY for real TTS. Falls back to browser Web Speech API.',
      browser_tts: true,
      text
    };
  }

  try {
    const requestBody = {
      model: 'speech-01',
      text: text,
      voice_setting: {
        voice_id: voice_id || 'male-qn-qingse',
        speed: speed,
        ...(voice_url && { voice_url })
      }
    };

    const response = await axios.post(`${MINIMAX_API_BASE}/t2a_v2`, requestBody, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        ...(process.env.MINIMAX_GROUP_ID && { 'GroupId': process.env.MINIMAX_GROUP_ID }),
      },
      timeout: 60000
    });

    // Handle different response formats
    let audioUrl = response.data?.audio_url || response.data?.data?.audio_file;
    if (!audioUrl && response.data?.data) {
      audioUrl = response.data.data;
    }

    return { audioUrl, status: 'success', text };

  } catch (error) {
    console.error('[MINIMAX TTS ERROR]', error.response?.data || error.message);
    throw new Error(`Speech generation failed: ${error.message}`);
  }
}

module.exports = { generateSpeech };