# ByrdHouse — Deployment Guide

## Overview

```
Frontend (Vercel)          Backend (Railway/Render)
┌─────────────────┐        ┌──────────────────────────┐
│ byrdhouse.app   │───────▶│ api.byrdhouse.app        │
│  (static build) │  /api  │  (Node.js + Express)     │
└─────────────────┘        └────────────┬─────────────┘
                                       │
                                       ▼
                              ┌──────────────┐
                              │  MiniMax API  │
                              └──────────────┘
```

---

## Step 1: Deploy Backend (Railway)

Railway is the easiest option — it auto-detects Node.js and has generous free tier.

### 1a. Create Railway Project

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `byrdhouse-backend` repo (or upload the folder)
4. Railway auto-detects Node.js — it will run `npm install && node server.js`

### 1b. Add Environment Variables

In Railway project → **Variables**, add:

```
PORT=3001
FRONTEND_URL=https://byrdhouse.app
MINIMAX_API_KEY=your_minimax_key
MINIMAX_GROUP_ID=your_group_id
MINIMAX_API_BASE=https://api.minimax.chat/v1
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx
```

### 1c. Set Start Command

In Railway → **Settings** → **Start Command**:
```
node server.js
```

### 1d. Custom Domain (optional)

Railway → **Settings** → **Networking** → **Custom Domain**:
```
api.byrdhouse.app
```
Then add DNS record: `CNAME api.byrdhouse.app → your-railway-url.railway.app`

---

## Step 2: Deploy Frontend (Vercel)

### 2a. Connect Repo

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `byrdhouse` repo (or the project folder)
3. Vercel auto-detects Vite framework

### 2b. Environment Variables

In Vercel → Project → **Settings** → **Environment Variables**:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_BACKEND_URL` | `https://api.byrdhouse.app` | Production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` | Production |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | `price_xxx` | Production |
| `VITE_STRIPE_PRICE_PRO_YEARLY` | `price_xxx` | Production |
| `VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY` | `price_xxx` | Production |
| `VITE_STRIPE_PRICE_ENTERPRISE_YEARLY` | `price_xxx` | Production |
| `VITE_BACKEND_URL` | `http://localhost:3001` | Development |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_xxx` | Development |

### 2c. Configure Rewrites

The `vercel.json` in the project already has rewrites, or set them in Vercel dashboard:

```
Source: /api/(.*)
Destination: https://YOUR_RAILWAY_URL/api/$1
```

### 2d. Deploy

Click **Deploy** — Vercel builds the Vite app and deploys to `byrdhouse.vercel.app`.

### 2e. Custom Domain

Vercel → **Settings** → **Domains**:
```
byrdhouse.app
```
Add DNS at your registrar: `CNAME byrdhouse.app → cname.vercel-dns.com`

---

## Step 3: Stripe Setup

### 3a. Get API Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys
2. Copy `STRIPE_SECRET_KEY` (sk_live_...) → Backend env
3. Copy `STRIPE_PUBLISHABLE_KEY` (pk_live_...) → Frontend env (VITE_ prefix)

### 3b. Create Products & Prices

1. **Dashboard** → **Products** → **Add product**
2. Pro plan: $9.99/month → copy **Price ID** (starts with `price_`)
3. Pro plan: $95.88/year → copy Price ID
4. Enterprise: $29.99/month → copy Price ID
5. Enterprise: $287.88/year → copy Price ID
6. Put all 4 Price IDs in both backend `.env` and Vercel env vars

### 3c. Webhooks

1. **Dashboard** → **Webhooks** → **Add endpoint**
2. URL: `https://api.byrdhouse.app/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy **Webhook Secret** → backend `STRIPE_WEBHOOK_SECRET`

---

## Step 4: MiniMax API Setup

1. Sign up at [minimaxi.com](https://minimaxi.com) or [platform.minimax.io](https://platform.minimax.io)
2. Get API key → backend `MINIMAX_API_KEY`
3. Find Group ID → backend `MINIMAX_GROUP_ID` (may not be needed depending on account type)
4. Top up credits (image/video generation costs credits)

---

## Step 5: DNS Configuration

```
# Main site
byrdhouse.app         CNAME  → cname.vercel-dns.com

# API subdomain
api.byrdhouse.app     CNAME  → your-railway-app.railway.app

# WWW redirect (optional)
www.byrdhouse.app     CNAME  → vercel-dns.com
```

---

## Step 6: Verify Everything Works

```bash
# Test backend health
curl https://api.byrdhouse.app/api/health

# Expected:
# {"status":"healthy","version":"3.1.0","services":{"minimax":"configured"}}

# Test frontend
# Visit https://byrdhouse.app and try the AI Chat tool
```

---

## Troubleshooting

**CORS errors**: Make sure backend `FRONTEND_URL` matches the frontend URL exactly (including https).

**Stripe not working**: Check webhook is pointing to correct URL and events are selected.

**MiniMax not generating**: Check API key is valid and account has credits.

**Video/Music showing errors**: Backend logs show poll results — check MiniMax dashboard for job status.

**Build fails on Vercel**: Run `npm run build` locally first to check for errors.