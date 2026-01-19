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

  return (
    <div className="container">
      <div className="space-y-12">
        {/* Header */}
        <header className="flex justify-between items-baseline flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest">/JARVIS</h1>
            <p className="mt-2 text-sm text-gray-600 tracking-tight">
              AI-powered progress briefing system. Generate comprehensive status reports from your tracked documents with{' '}
              <span className="text-black font-medium">real-time cost tracking</span> and{' '}
              <span className="text-black font-medium">usage analytics</span>.
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={generateBriefing}
              disabled={loading}
              className="text-xs font-mono uppercase px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? '⚙ GENERATING...' : '▶ GENERATE BRIEFING'}
            </button>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="border border-black p-6 bg-red-50">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-2 text-red-800">
              ⚠ ERROR
            </h3>
            <p className="text-xs text-red-600 font-mono leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {response && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="group">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 group-hover:text-black transition-colors">
                  Total Cost
                </span>
                <span className="text-lg font-medium tabular-nums">
                  ${response.cost.total_cost.toFixed(6)}
                </span>
              </div>
              <div className="group">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 group-hover:text-black transition-colors">
                  Total Tokens
                </span>
                <span className="text-lg font-medium tabular-nums">
                  {response.usage.total_tokens.toLocaleString()}
                </span>
              </div>
              <div className="group">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 group-hover:text-black transition-colors">
                  Documents
                </span>
                <span className="text-lg font-medium tabular-nums">
                  {response.metadata.documents_processed}/{response.metadata.documents_requested}
                </span>
              </div>
              <div className="group">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 group-hover:text-black transition-colors">
                  Model
                </span>
                <span className="text-sm font-medium font-mono">
                  {response.model_used.split('-').slice(0, 2).join('-')}
                </span>
              </div>
            </div>

            {/* Briefing Section */}
            <section className="space-y-4 pt-4 border-t border-black">
              <h2 className="text-xs font-bold uppercase tracking-wider">Briefing Output</h2>
              <div className="border border-black/10 p-6 bg-gray-50">
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {response.briefing}
                </pre>
              </div>
            </section>

            {/* Token Usage */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Token Usage Breakdown</h2>
              <div className="border border-black/10">
                <div className="flex justify-between items-center py-3 px-4 border-b border-black/5">
                  <span className="text-xs font-mono text-gray-600">Input Tokens</span>
                  <span className="text-sm font-medium tabular-nums">{response.usage.prompt_tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 border-b border-black/5">
                  <span className="text-xs font-mono text-gray-600">Output Tokens</span>
                  <span className="text-sm font-medium tabular-nums">{response.usage.completion_tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 border-b border-black/5">
                  <span className="text-xs font-mono text-gray-600">Reasoning Tokens</span>
                  <span className="text-sm font-medium tabular-nums">{response.usage.reasoning_tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 border-b border-black/5 bg-green-50">
                  <div>
                    <span className="text-xs font-mono text-green-800">Cached Tokens</span>
                    <span className="ml-2 text-[10px] text-green-600">💾 SAVINGS</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-green-800">
                    {response.usage.cached_tokens.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-black text-white">
                  <span className="text-xs font-mono uppercase tracking-wider">Total</span>
                  <span className="text-base font-bold tabular-nums">{response.usage.total_tokens.toLocaleString()}</span>
                </div>
              </div>
            </section>

            {/* Cost Breakdown */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Cost Breakdown</h2>
              <div className="border border-black/10">
                <div className="flex justify-between items-center py-3 px-4 border-b border-black/5">
                  <div>
                    <span className="text-xs font-mono text-gray-600">Input Cost</span>
                    <span className="ml-2 text-[10px] text-gray-400">@ $2.00/1M</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">${response.cost.input_cost.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 border-b border-black/5">
                  <div>
                    <span className="text-xs font-mono text-gray-600">Output Cost</span>
                    <span className="ml-2 text-[10px] text-gray-400">@ $10.00/1M</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">${response.cost.output_cost.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 border-b border-black/5 bg-green-50">
                  <div>
                    <span className="text-xs font-mono text-green-800">Cache Cost</span>
                    <span className="ml-2 text-[10px] text-green-600">@ $0.20/1M</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-green-800">
                    ${response.cost.cache_cost.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-black text-white">
                  <span className="text-xs font-mono uppercase tracking-wider">Total Cost ({response.cost.currency})</span>
                  <span className="text-base font-bold tabular-nums">${response.cost.total_cost.toFixed(6)}</span>
                </div>
              </div>
              <div className="p-4 border border-black/5 bg-green-50">
                <p className="text-xs text-green-700 leading-relaxed">
                  💡 <span className="font-medium">Cache savings:</span> Cached tokens cost 90% less than regular input tokens
                  ($0.20/1M vs $2.00/1M), significantly reducing API costs for repeated content.
                </p>
              </div>
            </section>

            {/* Metadata */}
            <div className="pt-8 border-t border-black/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                <div>
                  <span className="text-gray-500">Request ID:</span>{' '}
                  <span className="text-black">{response.request_id.slice(0, 8)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">Generated:</span>{' '}
                  <span className="text-black">{new Date(response.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Initial State */}
        {!response && !error && !loading && (
          <div className="border border-black/10 p-12 text-center">
            <p className="text-sm text-gray-600 mb-2">No briefing generated yet</p>
            <p className="text-xs text-gray-400">
              Click the button above to generate your first JARVIS progress briefing
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-6 border border-black/5 bg-gray-50">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-2">About This System</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            JARVIS is your AI-powered virtual chief of staff, designed to generate comprehensive progress briefings
            from your tracked documents. The system uses xAI's Grok models with real-time cost tracking, showing
            detailed token usage and pricing breakdowns. Cache optimization automatically reduces costs for repeated content.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
