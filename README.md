# JARVIS Progress Briefing API

A TypeScript-based API that generates AI-powered progress briefings using xAI's Grok models.

## Features

- Downloads and analyzes Google Docs
- Generates structured progress briefings with JARVIS personality
- Tracks token usage and costs
- Health check and pricing endpoints

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export XAI_API_KEY="your-xai-api-key"
```

3. Run locally:
```bash
npm run dev
```

## Endpoints

- `GET/POST /api/jarvis` - Generate progress briefing
- `GET /health` - Health check
- `GET /pricing` - View current pricing

## Testing

### Local Testing

1. Start the development server:
```bash
npm run dev
```

2. Test the health endpoint:
```bash
curl http://localhost:3000/health
```

3. Test the pricing endpoint:
```bash
curl http://localhost:3000/pricing
```

4. Test the briefing endpoint:
```bash
curl -X POST http://localhost:3000/api/jarvis
```

### Production Testing (After Deployment)

Replace `your-deployment-url.vercel.app` with your actual Vercel deployment URL:

1. Health check:
```bash
curl https://your-deployment-url.vercel.app/health
```

2. Pricing info:
```bash
curl https://your-deployment-url.vercel.app/pricing
```

3. Generate briefing:
```bash
curl -X POST https://your-deployment-url.vercel.app/api/jarvis
```

Or use your browser to visit:
- `https://your-deployment-url.vercel.app/health`
- `https://your-deployment-url.vercel.app/pricing`

## Environment Variables

- `XAI_API_KEY` (required) - Your xAI API key from console.x.ai
- `LOG_LEVEL` (optional) - Logging level (default: INFO)
- `DOWNLOAD_TIMEOUT` (optional) - Document download timeout in seconds (default: 30)
- `API_TIMEOUT` (optional) - xAI API timeout in seconds (default: 180)

## Deployment

Deploy to Vercel:
```bash
vercel
```

**Important:** Make sure to add your `XAI_API_KEY` in the Vercel project settings under Environment Variables.
