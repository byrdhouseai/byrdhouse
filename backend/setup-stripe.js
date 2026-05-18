#!/usr/bin/env node
// =============================================================================
// ByrdHouse — Stripe Product & Price Setup Script
// Run: node setup-stripe.js
//
// Prerequisites:
// 1. npm install stripe dotenv
// 2. Set STRIPE_SECRET_KEY in backend/.env or environment
// =============================================================================

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = [
  {
    name: 'ByrdHouse Pro',
    description: 'All 15 AI tools, unlimited credits, priority processing, 10% revenue share',
    prices: [
      { nickname: 'Pro Monthly', unit_amount: 999, interval: 'month' },
      { nickname: 'Pro Yearly', unit_amount: 9588, interval: 'year', metadata: { discount: '20%' } },
    ],
  },
  {
    name: 'ByrdHouse Enterprise',
    description: 'Everything Pro + Team access (5 seats), API access, 25% revenue share, dedicated manager',
    prices: [
      { nickname: 'Enterprise Monthly', unit_amount: 2999, interval: 'month' },
      { nickname: 'Enterprise Yearly', unit_amount: 28788, interval: 'year', metadata: { discount: '20%' } },
    ],
  },
];

async function setup() {
  console.log('\n🎯 ByrdHouse Stripe Setup\n');

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_key')) {
    console.error('❌ Set STRIPE_SECRET_KEY in backend/.env first');
    console.log('   Example: STRIPE_SECRET_KEY=sk_test_xxx...');
    process.exit(1);
  }

  const results = [];

  for (const product of PRODUCTS) {
    console.log(`\n📦 Creating product: ${product.name}`);

    const productObj = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: { app: 'byrdhouse' },
    });
    console.log(`   ✅ Product created: ${productObj.id}`);

    for (const priceData of product.prices) {
      const price = await stripe.prices.create({
        product: productObj.id,
        unit_amount: priceData.unit_amount,
        currency: 'usd',
        recurring: { interval: priceData.interval },
        nickname: priceData.nickname,
        metadata: priceData.metadata || {},
      });
      console.log(`   ✅ Price created: ${price.id}`);
      console.log(`   ${priceData.nickname} — $${(priceData.unit_amount / 100).toFixed(2)}/${priceData.interval} = ${price.id}`);
      results.push({ product: product.name, nickname: priceData.nickname, priceId: price.id });
    }
  }

  console.log('\n\n✅ ALL DONE! Copy these Price IDs to your .env files:\n');
  console.log('# backend/.env');
  for (const r of results) {
    const envKey = `STRIPE_PRICE_${r.product.split(' ')[1].toUpperCase()}_${r.nickname.split(' ').pop().toUpperCase()}`;
    console.log(`${envKey}=${r.priceId}`);
  }

  console.log('\n# byrdhouse/.env (Vercel environment variables)');
  for (const r of results) {
    const envKey = `VITE_STRIPE_PRICE_${r.product.split(' ')[1].toUpperCase()}_${r.nickname.split(' ').pop().toUpperCase()}`;
    console.log(`${envKey}=${r.priceId}`);
  }

  console.log('\n📋 Next: Set up webhook in Stripe Dashboard → Webhooks');
  console.log('   Endpoint: https://YOUR_BACKEND_URL/api/webhook');
  console.log('   Events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated');
}

setup().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});