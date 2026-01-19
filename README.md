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

Make sure to add your `XAI_API_KEY` in the Vercel environment variables.
