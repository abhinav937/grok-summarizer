# JARVIS Progress Briefing System

A full-stack application that generates AI-powered progress briefings using JARVIS (Tony Stark's AI assistant) personality. Built with FastAPI backend and React frontend.

## 🏗️ Architecture

```
grok-summarizer/
├── jarvis-api/          # FastAPI backend (Vercel deployment)
│   ├── api/jarvis.py    # Main API logic with cost tracking
│   ├── requirements.txt # Python dependencies
│   ├── vercel.json      # Vercel deployment config
│   └── README.md        # Backend documentation
└── frontend/            # React frontend (local development)
    ├── src/
    │   ├── App.tsx      # Main React component
    │   ├── App.css      # Styling
    │   └── index.tsx    # React entry point
    ├── public/
    ├── package.json     # Node dependencies
    └── README.md        # Frontend documentation
```

## 🚀 Quick Start

### Local Development

1. **Backend Setup:**
```bash
cd jarvis-api
pip install -r requirements.txt
export XAI_API_KEY=your_api_key_here
uvicorn api.jarvis:app --reload --port 8000
```

2. **Frontend Setup (New Terminal):**
```bash
cd frontend
npm install
npm start
```

3. **Access the app:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Health Check: `http://localhost:8000/health`
- Pricing Info: `http://localhost:8000/pricing`

### Production Deployment

1. **Deploy Backend:**
```bash
cd jarvis-api
vercel
```

2. **Update Frontend:**
Edit `frontend/src/App.tsx` and update the `API_BASE_URL`:
```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-vercel-deployment.vercel.app'
  : '';
```

3. **Deploy Frontend:**
```bash
cd frontend
npm run build
# Deploy the build/ folder to any static hosting service (Netlify, Vercel, etc.)
```

## 🎯 Features

### Backend (FastAPI)
- ✅ **Serverless deployment** on Vercel
- ✅ **Cost tracking** with real xAI pricing
- ✅ **Token usage analytics** (prompt, completion, reasoning, cached)
- ✅ **Model fallback** (grok-4-1-fast-reasoning → grok-4-fast-reasoning)
- ✅ **Document processing** from Google Docs/Sheets
- ✅ **Error handling** with request IDs for debugging
- ✅ **Health checks** and pricing endpoints

### Frontend (React)
- ✅ **One-click briefing generation**
- ✅ **Real-time loading states**
- ✅ **Beautiful response display** with:
  - Full JARVIS briefing (formatted)
  - Token usage statistics
  - Cost breakdown (USD)
  - Request metadata
- ✅ **Error handling** with user-friendly messages
- ✅ **Responsive design** for mobile/desktop

## 📊 API Response Examples

### Success Response
```json
{
  "status": "success",
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-01-19T10:30:45.123456",
  "briefing": "Sir, compiling your latest progress briefing from the attached files:\n\n1. Recent Achievements...\n2. Upcoming Goals...\n3. Timelines & Milestones...\n4. Action Items...\n5. Suggestions...",
  "model_used": "grok-4-1-fast-reasoning",
  "usage": {
    "prompt_tokens": 1500,
    "completion_tokens": 800,
    "reasoning_tokens": 200,
    "cached_tokens": 300,
    "total_tokens": 2300
  },
  "cost": {
    "input_cost": 0.003,
    "output_cost": 0.008,
    "cache_cost": 0.00006,
    "total_cost": 0.01106,
    "currency": "USD"
  },
  "metadata": {
    "documents_processed": 1,
    "documents_requested": 1
  }
}
```

### Cost Breakdown
- **Input Cost**: Based on prompt tokens ($2.00 per 1M tokens)
- **Output Cost**: Based on completion + reasoning tokens ($10.00 per 1M tokens)
- **Cache Cost**: Significantly cheaper cached tokens ($0.20 per 1M tokens)
- **Total Cost**: Sum of all costs with 6-decimal precision

## 🔧 Configuration

### Required Environment Variables
```bash
# For backend
XAI_API_KEY=your_xai_api_key_here

# Optional (with defaults)
LOG_LEVEL=INFO
DOWNLOAD_TIMEOUT=30
API_TIMEOUT=180
```

### Document Setup
Update `jarvis-api/api/jarvis.py` with your Google Docs export URLs:

```python
CORE_DOCS = {
    "Weekly Progress Tracker.docx":
        "https://docs.google.com/document/d/YOUR_DOC_ID/export?format=txt",
    # Add more documents as needed
}
```

## 🛠️ Development

### Backend Development
```bash
cd jarvis-api
pip install -r requirements.txt
uvicorn api.jarvis:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Testing
```bash
# Test backend locally
curl http://localhost:8000/api/

# Test health endpoint
curl http://localhost:8000/health

# Test pricing endpoint
curl http://localhost:8000/pricing
```

## 🚀 Deployment

### Backend (Vercel)
```bash
cd jarvis-api
vercel
```

### Frontend (Optional)
```bash
cd frontend
npm run build
# Deploy build/ folder to any static hosting service
```

## 💡 Usage Ideas

- **Daily Standup**: Automate morning progress briefings
- **Weekly Reviews**: Generate comprehensive weekly summaries
- **Project Tracking**: Monitor milestones and deliverables
- **Cost Monitoring**: Track API usage and costs over time

## 📈 Cost Optimization

- **Cached tokens**: Significantly cheaper than regular input tokens
- **Document optimization**: Smaller documents = lower costs
- **Selective processing**: Only process necessary documents
- **Model selection**: Primary model preferred for cost-efficiency

---

**Built with ❤️ using FastAPI, React, and xAI's Grok**