// =============================================================================
// Music Generation via MiniMax API
// =============================================================================

const axios = require('axios');

/**
 * Generate music using MiniMax Music API
 * Falls back to placeholder if no API key
 */
async function generateMusic(prompt, lyrics = null) {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_API_BASE = process.env.MINIMAX_API_BASE || 'https://api.minimax.chat/v1';

  if (!MINIMAX_API_KEY) {
    return {
      audioUrl: null,
      status: 'demo',
      message: 'Music generation requires MiniMax API key. Configure MINIMAX_API_KEY in .env for real music generation.',
      prompt
    };
  }

  try {
    const requestBody = {
      model: 'music-01',
      prompt: prompt,
      ...(lyrics && { lyrics })
    };

    const response = await axios.post(`${MINIMAX_API_BASE}/music_generation`, requestBody, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        ...(process.env.MINIMAX_GROUP_ID && { 'GroupId': process.env.MINIMAX_GROUP_ID }),
      },
      timeout: 120000
    });

    if (response.data.job_id) {
      // Backend-side polling — waits up to 5 min for MiniMax to finish
      console.log(`[MUSIC] Job started: ${response.data.job_id} — polling for result...`);
      const maxWait = 5 * 60 * 1000;
      const pollInterval = 5000;
      const start = Date.now();
      const key = MINIMAX_API_KEY;
      const base = MINIMAX_API_BASE;
      const groupId = process.env.MINIMAX_GROUP_ID;

      while (Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const pollResp = await axios.get(`${base}/music_generation`, {
            params: { job_id: response.data.job_id },
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              ...(groupId && { 'GroupId': groupId }),
            },
            timeout: 15000,
          });
          const pollData = pollResp.data;
          if (pollData.status === 'success' || pollData.status === 'completed') {
            console.log(`[MUSIC] Job ${response.data.job_id} complete`);
            return { audioUrl: pollData.audio_url || pollData.data?.audio_url, status: 'success', prompt };
          }
          if (pollData.status === 'failed') {
            throw new Error(pollData.error || 'Music generation failed on MiniMax side');
          }
        } catch (pollErr) {
          console.error(`[MUSIC POLL ERROR] ${response.data.job_id}: ${pollErr.message}`);
          await new Promise(r => setTimeout(r, pollInterval));
        }
      }
      throw new Error('Music generation timed out after 5 minutes');
    }

    return {
      audioUrl: response.data.audio_url,
      status: 'success',
      prompt
    };

  } catch (error) {
    console.error('[MINIMAX MUSIC ERROR]', error.response?.data || error.message);
    throw new Error(`Music generation failed: ${error.message}`);
  }
}

module.exports = { generateMusic };