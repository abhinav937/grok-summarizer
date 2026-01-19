import React, { useState } from 'react';
import './App.css';

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  total_tokens: number;
}

interface Cost {
  input_cost: number;
  output_cost: number;
  cache_cost: number;
  total_cost: number;
  currency: string;
}

interface Metadata {
  documents_processed: number;
  documents_requested: number;
}

interface BriefingResponse {
  status: string;
  request_id: string;
  timestamp: string;
  briefing: string;
  model_used: string;
  usage: Usage;
  cost: Cost;
  metadata: Metadata;
}

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? ''
  : '';

function App() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<BriefingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateBriefing = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/jarvis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
      }

      const data: BriefingResponse = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('Error generating briefing:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate briefing. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Header Section */}
      <section className="section">
        <header className="header">
          <h1>JARVIS Progress Briefing</h1>
          <p>AI-powered progress tracking system</p>
        </header>

        <button
          onClick={generateBriefing}
          disabled={loading}
          className="button"
          style={{ marginTop: '1.5rem' }}
        >
          {loading ? '[ Generating... ]' : '[ Generate Briefing ]'}
        </button>
      </section>

      {/* Error Section */}
      {error && (
        <section className="section">
          <h2 className="section-title error">Error</h2>
          <div className="error-content">
            <p>{error}</p>
            <details className="error-details">
              <summary>Troubleshooting</summary>
              <ul>
                <li>Ensure the backend API is running</li>
                <li>Check that XAI_API_KEY is set</li>
                <li>Verify Google Docs URLs are accessible</li>
                <li>Check browser console for detailed errors</li>
              </ul>
            </details>
          </div>
        </section>
      )}

      {/* Briefing Response */}
      {response && (
        <>
          {/* Briefing Text */}
          <section className="section">
            <div className="briefing-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Briefing</h2>
              <div className="briefing-meta">
                <span>{response.model_used}</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            <div className="briefing-text">{response.briefing}</div>
          </section>

          {/* Token Usage */}
          <section className="section">
            <h2 className="section-title">Token Usage</h2>
            <div className="grid">
              <div className="grid-item">
                <div className="grid-label">Prompt</div>
                <div className="grid-value">{response.usage.prompt_tokens.toLocaleString()}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Completion</div>
                <div className="grid-value">{response.usage.completion_tokens.toLocaleString()}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Reasoning</div>
                <div className="grid-value">{response.usage.reasoning_tokens.toLocaleString()}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Cached</div>
                <div className="grid-value">{response.usage.cached_tokens.toLocaleString()}</div>
              </div>
            </div>
            <div className="total-tokens">
              <div className="grid-label">Total Tokens</div>
              <div className="grid-value">{response.usage.total_tokens.toLocaleString()}</div>
            </div>
          </section>

          {/* Cost Breakdown */}
          <section className="section">
            <h2 className="section-title">Cost Analysis</h2>
            <div className="grid">
              <div className="grid-item">
                <div className="grid-label">Input Cost</div>
                <div className="grid-value">${response.cost.input_cost.toFixed(6)}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Output Cost</div>
                <div className="grid-value">${response.cost.output_cost.toFixed(6)}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Cache Cost</div>
                <div className="grid-value">${response.cost.cache_cost.toFixed(6)}</div>
              </div>
              <div className="grid-item highlight">
                <div className="grid-label">Total Cost</div>
                <div className="grid-value">${response.cost.total_cost.toFixed(6)}</div>
              </div>
            </div>
            <p className="cost-note">
              * Prices based on real-time model-specific rates. All costs in {response.cost.currency}.
            </p>
          </section>

          {/* Metadata */}
          <section className="section">
            <h2 className="section-title">Metadata</h2>
            <div className="grid">
              <div className="grid-item">
                <div className="grid-label">Request ID</div>
                <div className="grid-value">{response.request_id}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Timestamp</div>
                <div className="grid-value">{new Date(response.timestamp).toLocaleString()}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Documents Processed</div>
                <div className="grid-value">{response.metadata.documents_processed} / {response.metadata.documents_requested}</div>
              </div>
              <div className="grid-item">
                <div className="grid-label">Status</div>
                <div className="grid-value status-success">{response.status}</div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
