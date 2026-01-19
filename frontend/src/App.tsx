import React, { useState } from 'react';
import './App.css';

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
}

interface BriefingResponse {
  status: string;
  briefing: string;
  model_used: string;
  usage: Usage;
}

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://jarvis-api-abhinavs-projects-5c7e31e1.vercel.app'
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

  const calculateCost = (usage: Usage) => {
    const INPUT_COST_PER_1M = 0.03;
    const OUTPUT_COST_PER_1M = 0.15;
    const REASONING_COST_PER_1M = 0.15;

    const inputCost = (usage.prompt_tokens / 1_000_000) * INPUT_COST_PER_1M;
    const outputCost = (usage.completion_tokens / 1_000_000) * OUTPUT_COST_PER_1M;
    const reasoningCost = (usage.reasoning_tokens / 1_000_000) * REASONING_COST_PER_1M;
    const totalCost = inputCost + outputCost + reasoningCost;

    return {
      inputCost: inputCost.toFixed(6),
      outputCost: outputCost.toFixed(6),
      reasoningCost: reasoningCost.toFixed(6),
      totalCost: totalCost.toFixed(6),
    };
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
              <div className="grid-item highlight">
                <div className="grid-label">Total</div>
                <div className="grid-value">{response.usage.total_tokens.toLocaleString()}</div>
              </div>
            </div>
          </section>

          {/* Cost Breakdown */}
          <section className="section">
            <h2 className="section-title">Cost Analysis</h2>
            {(() => {
              const costs = calculateCost(response.usage);
              return (
                <>
                  <div className="grid">
                    <div className="grid-item">
                      <div className="grid-label">Input</div>
                      <div className="grid-value">${costs.inputCost}</div>
                    </div>
                    <div className="grid-item">
                      <div className="grid-label">Output</div>
                      <div className="grid-value">${costs.outputCost}</div>
                    </div>
                    <div className="grid-item">
                      <div className="grid-label">Reasoning</div>
                      <div className="grid-value">${costs.reasoningCost}</div>
                    </div>
                    <div className="grid-item highlight">
                      <div className="grid-label">Total</div>
                      <div className="grid-value">${costs.totalCost}</div>
                    </div>
                  </div>
                  <p className="cost-note">
                    * grok-4-1-fast-reasoning: $0.03/1M input, $0.15/1M output/reasoning
                  </p>
                </>
              );
            })()}
          </section>
        </>
      )}
    </div>
  );
}

export default App;
