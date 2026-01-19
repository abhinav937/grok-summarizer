# Deployment Fix for 404 Error

## Problem
The API endpoint `/api/jarvis` returns 404 because Vercel isn't properly detecting the Python serverless function.

## Root Cause
Vercel Python functions require:
1. A `handler` variable that exports the app
2. Proper `functions` configuration in vercel.json
3. Correct file path structure

## Solution Applied

### 1. Added Handler to jarvis.py
Added at the end of `jarvis-api/api/jarvis.py`:
```python
# Vercel serverless function handler
handler = app
```

### 2. Updated vercel.json
```json
{
  "buildCommand": "cd frontend && npm ci && npm run build",
  "outputDirectory": "frontend/build",
  "installCommand": "pip install -r jarvis-api/requirements.txt",
  "functions": {
    "jarvis-api/api/jarvis.py": {
      "runtime": "python3.12",
      "maxDuration": 60
    }
  },
  "rewrites": [
    {
      "source": "/api/jarvis",
      "destination": "/jarvis-api/api/jarvis.py"
    },
    {
      "source": "/health",
      "destination": "/jarvis-api/api/jarvis.py"
    },
    {
      "source": "/pricing",
      "destination": "/jarvis-api/api/jarvis.py"
    }
  ]
}
```

## How It Works

1. **Build**: Frontend builds to `frontend/build/`
2. **Functions**: Python app at `jarvis-api/api/jarvis.py` becomes serverless function
3. **Rewrites**: Routes `/api/jarvis`, `/health`, `/pricing` to Python function
4. **Handler**: `handler = app` exports FastAPI for Vercel

## Testing After Deployment

```bash
# Test health endpoint
curl https://your-app.vercel.app/health

# Test pricing endpoint
curl https://your-app.vercel.app/pricing

# Test main API
curl -X POST https://your-app.vercel.app/api/jarvis
```

## Expected Behavior

- ✅ Frontend serves from root (`/`)
- ✅ API responds at `/api/jarvis` (POST)
- ✅ Health check at `/health` (GET)
- ✅ Pricing info at `/pricing` (GET)
- ✅ Static assets (manifest.json, favicon.svg) serve correctly

## Deploy

```bash
git add .
git commit -m "fix: add Vercel handler for Python serverless function"
git push
```

The next deployment should work correctly!
