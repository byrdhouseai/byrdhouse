// =============================================================================
// BYRDHOUSE STRIPE INTEGRATION
// Backend: Node.js/Express  
// Frontend: React/Vite
// =============================================================================

// -----------------------------------------------------------------------------
// .env (Create this file - NEVER commit to git)
// -----------------------------------------------------------------------------

/*
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Prices (Create in Stripe Dashboard)
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx  
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx
*/

// -----------------------------------------------------------------------------
// Frontend - App.tsx Updates
// -----------------------------------------------------------------------------

// Your Publishable Key (safe to use in frontend)
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51TW34bHCR00pp0C0jedpcbuIJrrzR0FR3ytUNDV9q8Wasz2UujSjXKbQgV728yvXDojJ2pJeCQZDx3RP1Uu9CUdb00xDTdCtY3';

// Stripe Price IDs (Create these in Stripe Dashboard → Products)
const STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly_id';
const STRIPE_PRICE_PRO_YEARLY = 'price_pro_yearly_id';
const STRIPE_PRICE_ENTERPRISE_MONTHLY = 'price_enterprise_monthly_id';
const STRIPE_PRICE_ENTERPRISE_YEARLY = 'price_enterprise_yearly_id';

// -----------------------------------------------------------------------------
// Backend - server.js (Create this in /backend)
// -----------------------------------------------------------------------------

/*
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// Webhook (Stripe sends events here)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Update user tier in database
    console.log('Payment successful:', session.customer_email);
  }

  res.json({ received: true });
});

// Create Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  const { priceId, customerEmail, successUrl, cancelUrl } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  res.json({ sessionId: session.id, url: session.url });
});

// Get Customer Portal
app.post('/customer-portal', async (req, res) => {
  const { customerId } = req.body;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: 'https://byrdhouse.app/dashboard',
  });

  res.json({ url: session.url });
});

app.listen(4242, () => console.log('Server running on port 4242'));
*/

// -----------------------------------------------------------------------------
// Instructions
// -----------------------------------------------------------------------------

/*
1. ROTATE YOUR KEYS NOW
   - Go to dashboard.stripe.com → API Keys → Regenerate
   
2. Create Products in Stripe Dashboard
   - Products → Create Product
   - Name: "ByrdHouse Pro"
   - Type: "Recurring"
   - Interval: "Monthly" → Price: $9.99
   - Repeat for Yearly ($95.88)
   - Repeat for Enterprise ($29.99/mo, $287.88/yr)

3. Copy Price IDs
   - Dashboard → Products → Copy Price ID
   - Replace placeholders above

4. Setup Webhook (for production)
   - Dashboard → Webhooks → Add endpoint
   - URL: https://yourdomain.com/webhook
   - Events: checkout.session.completed, customer.subscription.deleted

5. Deploy Backend
   - Use Render.com / Railway.app / Vercel
   - Set Environment Variables
   - Never expose secret key in frontend
*/

// -----------------------------------------------------------------------------
// Quick Test Mode (Frontend Only - Simulated)
// -----------------------------------------------------------------------------

// For testing without backend, simulate checkout
const simulateCheckout = (tier: string, interval: string) => {
  console.log(`Simulated Stripe Checkout:
    Tier: ${tier}
    Interval: ${interval}
    Price: ${tier === 'pro' ? (interval === 'monthly' ? '$9.99' : '$95.88') : (interval === 'monthly' ? '$29.99' : '$287.88')}
    
  ✅ This would connect to real Stripe in production!
  `);
};

// Export for frontend
export {
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICE_PRO_MONTHLY,
  STRIPE_PRICE_PRO_YEARLY,
  STRIPE_PRICE_ENTERPRISE_MONTHLY,
  STRIPE_PRICE_ENTERPRISE_YEARLY,
  simulateCheckout
};