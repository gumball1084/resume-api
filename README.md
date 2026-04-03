# Resume Analyzer & Job Match API

A production-ready REST API for resume analysis, ATS scoring, and job description matching. Built to sell on RapidAPI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze/resume` | ATS score + skills + suggestions |
| POST | `/analyze/job-match` | Match score vs job description |
| POST | `/analyze/full` | Full combined analysis (premium) |
| POST | `/extract/skills` | Extract technical & soft skills |

## Quick Start (Local)

```bash
npm install
npm start
# Server runs on http://localhost:3000
```

## Deployment to Railway (Recommended - Free Tier Available)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway init`
4. Deploy: `railway up`
5. Get URL: `railway domain`

## Deployment to Render (Free Tier)

1. Push code to GitHub
2. Go to render.com → New Web Service
3. Connect your repo
4. Set: Build Command = `npm install`, Start Command = `npm start`
5. Deploy — you'll get a live URL

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `RAPIDAPI_PROXY_SECRET` | Set after listing on RapidAPI (from your API settings) |

## Listing on RapidAPI

1. Go to rapidapi.com → Sign up as provider
2. Click "Add New API"
3. Enter your deployed URL as the Base URL
4. Import `openapi.yaml` for automatic endpoint setup
5. Set up pricing tiers:
   - **Free**: 10 requests/month (for discoverability)
   - **Basic** ($9.99/mo): 500 requests/month
   - **Pro** ($29.99/mo): 5,000 requests/month  
   - **Ultra** ($99.99/mo): Unlimited
6. Publish!

## Suggested Pricing Tiers

```
Free:    10 req/month   → $0     (discovery bait)
Basic:   500 req/month  → $9.99  (indie devs)
Pro:     5k req/month   → $29.99 (small startups)
Ultra:   Unlimited      → $99.99 (enterprise/HR platforms)
```

Revenue potential: 100 Pro subscribers = $3,000/month passive income.
