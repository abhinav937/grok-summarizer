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
  : 'http://localhost:8000';

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

  const formatBriefing = (text: string) => {
    // Split by newlines and render with proper formatting
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 JARVIS Progress Briefing</h1>
        <p className="subtitle">AI-powered progress reports by your virtual chief of staff</p>

        <button
          onClick={generateBriefing}
          disabled={loading}
          className="generate-button"
        >
          {loading ? '⚙️ Generating...' : '🚀 Generate Briefing'}
        </button>

        {error && (
          <div className="error-box">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {response && (
          <div className="response-container">
            <div className="briefing-section">
              <h2>📋 Briefing</h2>
              <div className="briefing-content">
                {formatBriefing(response.briefing)}
              </div>
            </div>

            <div className="metadata-grid">
              <div className="metadata-card">
                <h3>🤖 Model</h3>
                <p className="model-name">{response.model_used}</p>
              </div>

              <div className="metadata-card">
                <h3>📄 Documents</h3>
                <p>{response.metadata.documents_processed} of {response.metadata.documents_requested} processed</p>
              </div>

              <div className="metadata-card">
                <h3>⏱️ Timestamp</h3>
                <p className="timestamp">{new Date(response.timestamp).toLocaleString()}</p>
              </div>

              <div className="metadata-card">
                <h3>🆔 Request ID</h3>
                <p className="request-id">{response.request_id.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>🔢 Token Usage</h3>
                <table className="stat-table">
                  <tbody>
                    <tr>
                      <td>Input Tokens:</td>
                      <td className="stat-value">{response.usage.prompt_tokens.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>Output Tokens:</td>
                      <td className="stat-value">{response.usage.completion_tokens.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>Reasoning Tokens:</td>
                      <td className="stat-value">{response.usage.reasoning_tokens.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>Cached Tokens:</td>
                      <td className="stat-value highlight">{response.usage.cached_tokens.toLocaleString()}</td>
                    </tr>
                    <tr className="total-row">
                      <td><strong>Total Tokens:</strong></td>
                      <td className="stat-value"><strong>{response.usage.total_tokens.toLocaleString()}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="stat-card">
                <h3>💰 Cost Breakdown</h3>
                <table className="stat-table">
                  <tbody>
                    <tr>
                      <td>Input Cost:</td>
                      <td className="stat-value">${response.cost.input_cost.toFixed(6)}</td>
                    </tr>
                    <tr>
                      <td>Output Cost:</td>
                      <td className="stat-value">${response.cost.output_cost.toFixed(6)}</td>
                    </tr>
                    <tr>
                      <td>Cache Cost:</td>
                      <td className="stat-value highlight">${response.cost.cache_cost.toFixed(6)}</td>
                    </tr>
                    <tr className="total-row">
                      <td><strong>Total Cost:</strong></td>
                      <td className="stat-value"><strong>${response.cost.total_cost.toFixed(6)} {response.cost.currency}</strong></td>
                    </tr>
                  </tbody>
                </table>
                <p className="cost-note">💡 Cached tokens save you money!</p>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
