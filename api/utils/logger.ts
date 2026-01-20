/**
 * Logging utilities for API interaction tracking
 * Provides helper functions to log API requests, responses, costs, and timing
 */

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cached_tokens?: number;
}

export interface CostBreakdown {
  input_cost: number;
  output_cost: number;
  cache_cost: number;
  total_cost: number;
  currency: string;
}

export interface LogEntry {
  request_id: string;
  endpoint: string;
  method?: string;
  message_content?: string;
  response_content?: string;
  model_used?: string;
  tokens?: TokenUsage;
  cost?: CostBreakdown;
  duration_ms?: number;
  status: 'success' | 'error';
  error?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Calculate API call costs based on token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens: number = 0
): CostBreakdown {
  // Pricing per 1M tokens (as of January 2026)
  const PRICING: Record<string, { input: number; output: number; cached: number }> = {
    "grok-4-1-fast-reasoning": {
      input: 0.20,
      output: 0.50,
      cached: 0.02,
    },
    "grok-4-fast-reasoning": {
      input: 0.20,
      output: 0.50,
      cached: 0.02,
    },
    "grok-4-fast": {
      input: 0.20,
      output: 0.50,
      cached: 0.05,
    },
    default: {
      input: 0.20,
      output: 0.50,
      cached: 0.02,
    },
  };

  const pricing = PRICING[model] || PRICING.default;

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  const cacheCost = (cachedTokens / 1_000_000) * pricing.cached;
  const totalCost = inputCost + outputCost + cacheCost;

  return {
    input_cost: parseFloat(inputCost.toFixed(6)),
    output_cost: parseFloat(outputCost.toFixed(6)),
    cache_cost: parseFloat(cacheCost.toFixed(6)),
    total_cost: parseFloat(totalCost.toFixed(6)),
    currency: 'USD'
  };
}

/**
 * Wrap an async function to measure its execution time
 */
export async function withTiming<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration_ms: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration_ms = Date.now() - startTime;
  return { result, duration_ms };
}

/**
 * Log an API interaction to the centralized logging endpoint
 * Returns true if logging was successful, false otherwise
 */
export async function logApiInteraction(entry: LogEntry): Promise<boolean> {
  try {
    const logsEndpoint = process.env.LOGS_ENDPOINT || 'https://ai-reply-bot.vercel.app/api/logs';

    // Add timestamp if not provided
    const logData = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    const response = await fetch(logsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      console.error('[Logger] Failed to log, status:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    // Don't fail the main request if logging fails
    console.error('[Logger] Failed to log API interaction:', error);
    return false;
  }
}

/**
 * Format token usage for logging
 */
export function formatTokenUsage(usage: TokenUsage): string {
  return `Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, ` +
    `Cached: ${usage.cached_tokens || 0}, Total: ${usage.total_tokens}`;
}

/**
 * Format cost for logging
 */
export function formatCost(cost: CostBreakdown): string {
  return `$${cost.total_cost.toFixed(6)} ${cost.currency} ` +
    `(input: $${cost.input_cost.toFixed(6)}, output: $${cost.output_cost.toFixed(6)}, ` +
    `cache: $${cost.cache_cost.toFixed(6)})`;
}
