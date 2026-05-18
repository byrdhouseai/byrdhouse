// =============================================================================
// Image Generation via MiniMax API
// =============================================================================

const axios = require('axios');

/**
 * Generate image using MiniMax API
 * API Base: https://api.minimax.chat/v1
 */
async function generateImage(prompt, width = 1024, height = 1024) {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;
  const MINIMAX_API_BASE = process.env.MINIMAX_API_BASE || 'https://api.minimax.chat/v1';

  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY not configured. Set it in backend .env file.');
  }

  try {
    const response = await axios.post(
      `${MINIMAX_API_BASE}/image_generation`,
      {
        model: 'image-01',
        prompt: prompt,
        num_images: 1,
        width: Math.min(width, 1280),
        height: Math.min(height, 1280),
      },
      {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json',
          ...(MINIMAX_GROUP_ID && { 'GroupId': MINIMAX_GROUP_ID }),
        },
        timeout: 60000,
      }
    );

    // Handle new response format (base64 data) vs URL format
    let imageUrl = response.data?.data?.[0]?.url || response.data?.image_url;
    if (!imageUrl && response.data?.data?.[0]?.b64_image) {
      imageUrl = `data:image/png;base64,${response.data.data[0].b64_image}`;
    }
    
    if (!imageUrl) {
      console.error('[MINIMAX IMAGE] No URL in response:', JSON.stringify(response.data));
      throw new Error('No image URL returned from MiniMax');
    }

    console.log(`[IMAGE] Generated via MiniMax: ${prompt.substring(0, 50)}...`);
    return {
      imageUrl,
      prompt,
      width,
      height,
      status: 'success',
      provider: 'minimax',
    };
  } catch (error) {
    console.error('[MINIMAX IMAGE ERROR]', error.response?.data || error.message);
    throw new Error(`Image generation failed: ${error.message}`);
  }
}

module.exports = { generateImage };