# JARVIS Progress Briefing API

A serverless API endpoint deployed on Vercel that generates JARVIS-style progress briefings from your Google Docs.

## Features

- **Serverless Deployment**: Hosted on Vercel with automatic scaling
- **HTTP Triggers**: Trigger briefings via GET or POST requests
- **JSON Responses**: Returns structured data with briefing content and usage stats
- **Error Handling**: Robust error handling with detailed error messages
- **File Management**: Automatic cleanup of uploaded files after processing

## Project Structure

```
jarvis-api/
├── api/
│   └── jarvis.py     # FastAPI serverless function
├── requirements.txt  # Python dependencies
├── vercel.json       # Vercel deployment configuration
└── README.md         # This file
```

## Setup & Deployment

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally via npm
   ```bash
   npm install -g vercel
   ```

3. **XAI API Key**: Your xAI API key for accessing Grok models

### Configuration

#### 1. Update Document URLs

Edit `api/jarvis.py` and replace the placeholder URLs in `CORE_DOCS` with your actual Google Docs export links:

```python
CORE_DOCS = {
    "Weekly Progress Tracker.docx":
        "https://docs.google.com/document/d/YOUR_WEEKLY_TRACKER_DOC_ID/export?format=txt",

    "Project Timelines & Milestones.gsheet":
        "https://docs.google.com/spreadsheets/d/YOUR_TIMELINES_SHEET_ID/export?format=csv",

    "Goals & Plans 2026.docx":
        "https://docs.google.com/document/d/YOUR_GOALS_2026_DOC_ID/export?format=txt"
}
```

**To get export URLs:**
- Open your Google Doc/Sheet
- Click "Share" → "Publish to web"
- Choose format (TXT for Docs, CSV for Sheets)
- Copy the generated link

#### 2. Set Environment Variables

Set your XAI API key as a Vercel environment variable:

```bash
vercel env add XAI_API_KEY
```

Or via Vercel dashboard: Project Settings → Environment Variables

### Deployment

1. **Navigate to project directory:**
   ```bash
   cd jarvis-api
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Follow prompts:**
   - Link to Vercel account
   - Choose/create project
   - Deploy

4. **Get your deployment URL:**
   - Example: `https://jarvis-api-yourname.vercel.app/`

## Usage

### Trigger Briefing

**Via GET request:**
```bash
curl https://your-project.vercel.app/api/
```

**Via POST request:**
```bash
curl -X POST https://your-project.vercel.app/api/
```

**Via frontend:**
Visit your frontend deployment to use the web interface, or access API directly

### Response Format

```json
{
  "status": "success",
  "briefing": "Sir, compiling your latest progress briefing...",
  "model_used": "grok-4-1-fast-reasoning",
  "usage": {
    "prompt_tokens": 1500,
    "completion_tokens": 800,
    "reasoning_tokens": 200,
    "total_tokens": 2300
  }
}
```

### Automation

#### Daily Cron Job (Local Machine)
```bash
# macOS/Linux
crontab -e
# Add: 0 9 * * * curl https://your-project.vercel.app/

# Windows Task Scheduler
# Create task to run: curl https://your-project.vercel.app/
```

#### External Services
- **cron-job.org**: Free cron service
- **GitHub Actions**: Scheduled workflows
- **Zapier**: Webhook triggers
- **EasyCron**: Cron as a service

## Local Testing

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variable:**
   ```bash
   export XAI_API_KEY=your_api_key_here
   ```

3. **Run locally:**
   ```bash
   uvicorn api.jarvis:app --reload
   ```

4. **Test endpoint:**
   ```bash
   curl http://localhost:8000/
   ```

## Technical Details

### Models
- **Primary**: `grok-4-1-fast-reasoning`
- **Fallback**: `grok-4-fast-reasoning`

### Timeouts
- **API Timeout**: 180 seconds
- **Vercel Limit**: 60s (hobby) / 300s (pro)

### Cold Starts
- First request after idle: ~1-2s delay
- Subsequent requests: Fast response

### Error Handling
- Invalid API key: 500 with "XAI_API_KEY not set"
- Download failures: 500 with "No documents downloaded"
- Upload failures: 500 with "No files uploaded"
- Generation failures: 500 with "Briefing generation failed"

## Troubleshooting

### Common Issues

1. **"XAI_API_KEY not set"**
   - Ensure environment variable is set in Vercel dashboard
   - Redeploy after adding environment variables

2. **"No documents downloaded"**
   - Verify Google Docs URLs are correct and publicly accessible
   - Check export links are properly formatted

3. **Timeout errors**
   - Upgrade to Vercel Pro for 300s timeout limit
   - Consider optimizing document sizes

4. **Import errors**
   - Ensure `xai-sdk` is available on PyPI
   - May need to vendor the SDK if not pip-installable

### Debugging

1. **Check Vercel logs:**
   ```bash
   vercel logs
   ```

2. **Test locally first** before deploying

3. **Verify document access** by testing export URLs directly

## Security Considerations

- **API Key**: Store securely as environment variable
- **Document Access**: Ensure Google Docs are set to appropriate sharing permissions
- **Rate Limiting**: Consider implementing if needed for high-traffic scenarios

## Cost Optimization

- **Pay per trigger**: Only runs when called
- **File cleanup**: Automatic deletion prevents storage costs
- **Model selection**: Primary model preferred for cost-efficiency

## Future Enhancements

- Add authentication (API keys, JWT)
- Implement caching for frequently accessed documents
- Add webhook notifications for briefing completion
- Support for multiple briefing formats (email, Slack, etc.)
