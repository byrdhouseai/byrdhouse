// =============================================================================
// BYRDHOUSE BACKEND SERVER v3.0
// MiniMax AI + Stripe Payments (no Ollama dependency)
// =============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { generateImage } = require('./utils/imageGen');
const { generateVideo } = require('./utils/videoGen');
const { generateMusic } = require('./utils/musicGen');
const { generateSpeech } = require('./utils/speechGen');
const { generatePDF } = require('./utils/pdfGen');
const { generateSlides } = require('./utils/slidesGen');
const { createJob, getJob } = require('./utils/jobs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// =============================================================================
// HELPERS
// =============================================================================

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_BASE = process.env.MINIMAX_BASE || 'https://api.minimax.chat/v1';

const trackAPIUsage = (endpoint, userId) => {
  console.log(`[API] ${endpoint} - User: ${userId || 'anonymous'} - ${new Date().toISOString()}`);
};

// MiniMax chat completion (all text/AI tasks)
async function minimaxChat(prompt, systemPrompt = null) {
  if (!MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY not configured');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await axios.post(
    `${MINIMAX_BASE}/text/chatcompletion_v2`,
    { model: 'abab6.5s-chat', messages },
    {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        ...(process.env.MINIMAX_GROUP_ID && { 'GroupId': process.env.MINIMAX_GROUP_ID }),
      },
      timeout: 60000,
    }
  );
  return response.data.choices?.[0]?.message?.content || '';
}

// =============================================================================
// AI CHAT
// =============================================================================

app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, history = [] } = req.body;
    trackAPIUsage('/api/chat', userId);

    const systemPrompt = 'You are ByrdHouse AI — a helpful, creative, and friendly AI assistant. You help users with writing, coding, analysis, brainstorming, and general questions. Be concise, helpful, and a bit witty.';
    
    let fullPrompt = message;
    if (history.length > 0) {
      const context = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      fullPrompt = `Conversation so far:\n${context}\n\nUser: ${message}\n\nAssistant:`;
    }

    const response = await minimaxChat(fullPrompt, systemPrompt);
    res.json({ response, model: 'abab6.5s-chat' });

  } catch (error) {
    console.error('[CHAT ERROR]', error.message);
    res.status(500).json({ error: error.message || 'AI service unavailable. Check MINIMAX_API_KEY in .env' });
  }
});

// =============================================================================
// CODE GENERATION
// =============================================================================

app.post('/api/code', async (req, res) => {
  try {
    const { language, prompt, userId } = req.body;
    trackAPIUsage('/api/code', userId);

    const systemPrompt = `You are an expert ${language} programmer. Generate clean, well-commented code based on the user's request. Only output the code — no markdown, no explanation, no backticks. Start directly with the code.`;
    
    let code = await minimaxChat(`Create ${language} code for: ${prompt}`, systemPrompt);
    code = code.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    
    res.json({ code, language, model: 'abab6.5s-chat' });

  } catch (error) {
    console.error('[CODE ERROR]', error.message);
    res.status(500).json({ error: error.message || 'Code generation unavailable.' });
  }
});

// =============================================================================
// CONTENT WRITING
// =============================================================================

app.post('/api/write', async (req, res) => {
  try {
    const { type, prompt, userId } = req.body;
    trackAPIUsage('/api/write', userId);

    const typePrompts = {
      email: `Write a professional email based on this request: "${prompt}". Format with subject line, greeting, body, and sign-off. Be concise and professional.`,
      article: `Write a well-structured article/blog post about: "${prompt}". Include an intro, 3-5 sections with headings, and a conclusion. Make it engaging and informative.`,
      post: `Write a compelling social media post (Twitter/X style) about: "${prompt}". Make it engaging, use hooks, and include relevant hashtags. Keep it under 280 characters.`,
    };

    const fullPrompt = typePrompts[type] || typePrompts.article;
    const content = await minimaxChat(fullPrompt);
    res.json({ content, type });

  } catch (error) {
    console.error('[WRITE ERROR]', error.message);
    res.status(500).json({ error: error.message || 'Writing service unavailable.' });
  }
});

// =============================================================================
// TRANSLATION
// =============================================================================

app.post('/api/translate', async (req, res) => {
  try {
    const { text, from = 'auto', to = 'es', userId } = req.body;
    trackAPIUsage('/api/translate', userId);

    const translation = await minimaxChat(
      `Translate the following text to ${to}. Only output the translation — no explanation, no quotes, just the translated text.\n\nText: ${text}`
    );
    res.json({ translation: translation.trim(), from, to });

  } catch (error) {
    console.error('[TRANSLATE ERROR]', error.message);
    res.status(500).json({ error: error.message || 'Translation service unavailable.' });
  }
});

// =============================================================================
// IMAGE GENERATION (MiniMax)
// =============================================================================

app.post('/api/image-generate', async (req, res) => {
  try {
    const { prompt, userId, width = 1024, height = 1024 } = req.body;
    trackAPIUsage('/api/image-generate', userId);
    const result = await generateImage(prompt, width, height);
    res.json(result);
  } catch (error) {
    console.error('[IMAGE ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// VIDEO GENERATION (MiniMax)
// =============================================================================

app.post('/api/video-generate', async (req, res) => {
  try {
    const { prompt, imageUrl, userId, duration = 6, resolution = '768P' } = req.body;
    trackAPIUsage('/api/video-generate', userId);
    const result = await generateVideo(prompt, imageUrl, duration, resolution);
    res.json(result);
  } catch (error) {
    console.error('[VIDEO ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// MUSIC GENERATION (MiniMax)
// =============================================================================

app.post('/api/music-generate', async (req, res) => {
  try {
    const { prompt, lyrics, userId } = req.body;
    trackAPIUsage('/api/music-generate', userId);
    const result = await generateMusic(prompt, lyrics);
    res.json(result);
  } catch (error) {
    console.error('[MUSIC ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// TEXT TO SPEECH (MiniMax)
// =============================================================================

app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice_id, speed = 1.0, userId } = req.body;
    trackAPIUsage('/api/tts', userId);
    const result = await generateSpeech(text, voice_id, speed);
    res.json(result);
  } catch (error) {
    console.error('[TTS ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// PDF GENERATION
// =============================================================================

app.post('/api/pdf-generate', async (req, res) => {
  try {
    const { title, content, userId } = req.body;
    trackAPIUsage('/api/pdf-generate', userId);
    const result = await generatePDF(title, content);
    res.json(result);
  } catch (error) {
    console.error('[PDF ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SLIDES GENERATION
// =============================================================================

app.post('/api/slides-generate', async (req, res) => {
  try {
    const { topic, userId } = req.body;
    trackAPIUsage('/api/slides-generate', userId);
    const result = await generateSlides(topic);
    res.json(result);
  } catch (error) {
    console.error('[SLIDES ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// BACKGROUND REMOVAL
// =============================================================================

app.post('/api/bg-remove', async (req, res) => {
  try {
    const { imageUrl, userId } = req.body;
    trackAPIUsage('/api/bg-remove', userId);

    if (!MINIMAX_API_KEY) {
      res.json({ imageUrl, status: 'demo', message: 'Configure MINIMAX_API_KEY for background removal' });
      return;
    }

    // Use MiniMax image editing endpoint for background removal
    const response = await axios.post(
      `${MINIMAX_BASE}/image_generation`,
      {
        model: 'image-01',
        prompt: `remove background, transparent background, isolated subject, only keep the main subject: ${imageUrl}`,
        num_images: 1,
        width: 1024,
        height: 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json',
          'GroupId': process.env.MINIMAX_GROUP_ID,
        },
        timeout: 60000,
      }
    );

    const newUrl = response.data?.data?.[0]?.url || response.data?.image_url;
    res.json({ imageUrl: newUrl || imageUrl, status: newUrl ? 'success' : 'demo' });

  } catch (error) {
    console.error('[BG REMOVE ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// LOGO GENERATION
// =============================================================================

app.post('/api/logo-generate', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    trackAPIUsage('/api/logo-generate', userId);
    const logoPrompt = `${prompt}, professional logo design, vector style, minimalist, clean lines, transparent background`;
    const result = await generateImage(logoPrompt, 512, 512);
    res.json(result);
  } catch (error) {
    console.error('[LOGO ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// IMAGE EDITING
// =============================================================================

app.post('/api/image-edit', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    trackAPIUsage('/api/image-edit', userId);
    const result = await generateImage(`${prompt}, professional photo editing, high quality`, 1024, 1024);
    res.json(result);
  } catch (error) {
    console.error('[IMAGE EDIT ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// VOICE CLONING
// =============================================================================

app.post('/api/voice-clone', async (req, res) => {
  try {
    const { text, userId } = req.body;
    trackAPIUsage('/api/voice-clone', userId);
    const result = await generateSpeech(text, null, 1.0);
    res.json(result);
  } catch (error) {
    console.error('[VOICE CLONE ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// THUMBNAIL GENERATION
// =============================================================================

app.post('/api/thumbnail-generate', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    trackAPIUsage('/api/thumbnail-generate', userId);
    const thumbPrompt = `${prompt}, YouTube thumbnail, bold typography, high contrast, eye-catching, 16:9 aspect ratio, professional design`;
    const result = await generateImage(thumbPrompt, 1280, 720);
    res.json(result);
  } catch (error) {
    console.error('[THUMBNAIL ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '3.1.0',
    timestamp: new Date().toISOString(),
    services: {
      minimax: MINIMAX_API_KEY ? 'configured' : 'missing',
    }
  });
});

// =============================================================================
// JOB STATUS (for async video/music jobs)
// =============================================================================

app.get('/api/job/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    jobId: req.params.jobId,
    status: job.status,
    result: job.result,
    error: job.error,
  });
});

// =============================================================================
// STRIPE CHECKOUT SESSION
// =============================================================================

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { tier, interval, userId } = req.body;
    trackAPIUsage('/api/create-checkout-session', userId);

    if (!process.env.STRIPE_SECRET_KEY) {
      res.status(500).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY in .env' });
      return;
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const priceMap = {
      pro: { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY, yearly: process.env.STRIPE_PRICE_PRO_YEARLY },
      enterprise: { monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY },
    };
    const priceId = priceMap[tier]?.[interval];
    if (!priceId) {
      res.status(400).json({ error: 'Invalid tier or interval' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?upgrade=cancelled`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[CHECKOUT ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STRIPE CUSTOMER PORTAL
// =============================================================================

app.post('/api/customer-portal', async (req, res) => {
  try {
    const { customerId, userId } = req.body;
    trackAPIUsage('/api/customer-portal', userId);

    if (!process.env.STRIPE_SECRET_KEY) {
      res.status(500).json({ error: 'Stripe not configured' });
      return;
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.FRONTEND_URL || 'http://localhost:5173',
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('[PORTAL ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STRIPE WEBHOOK
// =============================================================================

app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('[WEBHOOK] Checkout completed for customer:', session.customer_email);
      // TODO: Update user tier in your database based on session.customer
      // e.g., setUserTier(session.customer, session.subscription);
      break;
    case 'customer.subscription.deleted':
      console.log('[WEBHOOK] Subscription cancelled:', event.data.object.customer);
      // TODO: Downgrade user to free tier
      break;
    default:
      console.log('[WEBHOOK] Unhandled event type:', event.type);
  }

  res.json({ received: true });
});

// =============================================================================
// SERVER START
// =============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                  BYRDHOUSE BACKEND v3.1                   ║
╠═══════════════════════════════════════════════════════════╣
║  Status:    RUNNING                                       ║
║  Port:      ${PORT}                                            ║
║  MiniMax:   ${(MINIMAX_API_KEY ? '✓ Configured' : '✗ Missing').padEnd(24)}║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;