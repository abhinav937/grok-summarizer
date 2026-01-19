# JARVIS Frontend

A React frontend for the JARVIS Progress Briefing API.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open in your browser at `http://localhost:3000`.

## Configuration

### For Local Development
The frontend is configured to proxy API requests to `http://localhost:8000/api/` (where the FastAPI backend runs).

### For Production
Update the `API_BASE_URL` in `src/App.tsx` to point to your deployed Vercel API endpoint:

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-vercel-deployment.vercel.app'
  : '';
```

## Features

- **One-Click Generation**: Generate JARVIS progress briefings with a single button click
- **Real-time Loading States**: Visual feedback during briefing generation
- **Comprehensive Response Display**:
  - Full JARVIS briefing text in monospace format
  - Token usage statistics (prompt, completion, reasoning, total)
  - Detailed cost breakdown with pricing per token type
  - Metadata including model used, status, and timestamp
- **Robust Error Handling**:
  - Clear error messages with troubleshooting tips
  - Expandable debugging information
- **Responsive Design**: Mobile-friendly layout that adapts to all screen sizes
- **Modern UI**: Beautiful gradient design with glass-morphism effects

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.