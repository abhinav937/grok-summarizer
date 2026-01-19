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
    <div className="App">
      <header className="App-header">
        <h1>JARVIS Progress Briefing</h1>
        <button onClick={generateBriefing} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Briefing'}
        </button>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {response && (
          <div>
            <h2>Briefing:</h2>
            <p>{response.briefing}</p>
            <h3>Model Used: {response.model_used}</h3>
            <h3>Token Usage:</h3>
            <ul>
              <li>Prompt Tokens: {response.usage.prompt_tokens}</li>
              <li>Completion Tokens: {response.usage.completion_tokens}</li>
              <li>Reasoning Tokens: {response.usage.reasoning_tokens}</li>
              <li>Total Tokens: {response.usage.total_tokens}</li>
            </ul>
            <h3>Cost Analysis:</h3>
            {(() => {
              const costs = calculateCost(response.usage);
              return (
                <ul>
                  <li>Input Cost: ${costs.inputCost}</li>
                  <li>Output Cost: ${costs.outputCost}</li>
                  <li>Reasoning Cost: ${costs.reasoningCost}</li>
                  <li>Total Cost: ${costs.totalCost}</li>
                </ul>
              );
            })()}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
