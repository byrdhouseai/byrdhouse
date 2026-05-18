// =============================================================================
// Video Generation via MiniMax API
// =============================================================================

const axios = require('axios');

/**
 * Generate video using MiniMax Video-01 API
 * Falls back to image-to-video via Pollinations if no API key
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generateVideo(prompt, imageUrl = null, duration = 6, resolution = '768P') {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_API_BASE = process.env.MINIMAX_API_BASE || 'https://api.minimax.chat/v1';
  
  if (!MINIMAX_API_KEY) {
    // Fallback: Use Pollinations video (text-to-video)
    const safePrompt = encodeURIComponent(prompt.substring(0, 200));
    const videoUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=576&seed=${Math.floor(Math.random() * 999999)}&nologo=true&motion=0.5`;
    
    return {
      videoUrl: null,
      status: 'demo',
      message: 'Video generation requires MiniMax API key. Configure MINIMAX_API_KEY in .env for real video generation.',
      demo_image_url: imageUrl || videoUrl,
      prompt
    };
  }

  try {
    // MiniMax Video generation
    // If we have an image, use image-to-video, otherwise text-to-video
    let requestBody;
    
    if (imageUrl) {
      // Image-to-video via MiniMax
      requestBody = {
        model: 'video-01',
        prompt: prompt,
        first_frame_image: imageUrl,
        duration: duration === 10 ? 10 : 6,
      };
    } else {
      // Text-to-video via MiniMax  
      requestBody = {
        model: 'video-01',
        prompt: prompt,
        duration: duration === 10 ? 10 : 6,
      };
    }

    const response = await axios.post(`${MINIMAX_API_BASE}/video_generation`, requestBody, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        ...(process.env.MINIMAX_GROUP_ID && { 'GroupId': process.env.MINIMAX_GROUP_ID }),
      },
      timeout: 120000
    });

    // Poll for result if job ID returned
    if (response.data.job_id) {
      // Poll MiniMax until job completes (backend-side polling, transparent to frontend)
      console.log(`[VIDEO] Job started: ${response.data.job_id} — polling for result...`);
      const maxWait = 5 * 60 * 1000; // 5 min timeout
      const pollInterval = 5000;
      const start = Date.now();
      const key = MINIMAX_API_KEY;
      const base = MINIMAX_API_BASE;
      const groupId = process.env.MINIMAX_GROUP_ID;

      while (Date.now() - start < maxWait) {
        await sleep(3000); // wait 3s before first poll
        try {
          const pollResp = await axios.get(`${base}/video_generation`, {
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
            console.log(`[VIDEO] Job ${response.data.job_id} complete`);
            return { videoUrl: pollData.video_url || pollData.data?.video_url, status: 'success', prompt };
          }
          if (pollData.status === 'failed') {
            throw new Error(pollData.error || 'Video generation failed on MiniMax side');
          }
          // still processing
        } catch (pollErr) {
          console.error(`[VIDEO POLL ERROR] ${response.data.job_id}: ${pollErr.message}`);
          await sleep(pollInterval);
        }
      }
      throw new Error('Video generation timed out after 5 minutes');
    }

    return {
      videoUrl: response.data.video_url,
      status: 'success',
      prompt
    };

  } catch (error) {
    console.error('[MINIMAX VIDEO ERROR]', error.response?.data || error.message);
    throw new Error(`Video generation failed: ${error.message}`);
  }
}

module.exports = { generateVideo };