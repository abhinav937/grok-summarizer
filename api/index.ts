/**
 * JARVIS Progress Briefing API Endpoint for Vercel
 * - Trigger via HTTP (e.g., GET /api/jarvis)
 * - Returns JSON with briefing, stats, token usage, and cost
 *
 * Required Environment Variables:
 * - XAI_API_KEY: Your xAI API key from console.x.ai
 *
 * Optional Environment Variables:
 * - LOG_LEVEL: Logging level (default: INFO)
 * - DOWNLOAD_TIMEOUT: Timeout for document downloads in seconds (default: 30)
 * - API_TIMEOUT: Timeout for xAI API calls in seconds (default: 180)
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logApiInteraction, generateRequestId } from './utils/logger.js';

// Configuration
const CORE_DOCS: Record<string, string> = {
  "Weekly Progress Tracker.docx":
    "https://docs.google.com/document/d/1ns8g0pHyD6gchd8-ZyWlMDxov-DzxoOY0aOgv1NpZOE/export?format=txt",
};

const PRIMARY_MODEL = "grok-4-1-fast-reasoning";
const FALLBACK_MODEL = "grok-4-1-fast-reasoning";
const DOWNLOAD_TIMEOUT = parseInt(process.env.DOWNLOAD_TIMEOUT || '30') * 1000;
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '180') * 1000;

// Pricing per 1M tokens (updated January 2026 - https://x.ai/api)
const PRICING: Record<string, { input: number; output: number; cached: number }> = {
  "grok-4-1-fast-reasoning": {
    input: 0.20,   // $0.20 per 1M tokens
    output: 0.50,  // $0.50 per 1M tokens
    cached: 0.02,  // $0.02 per 1M tokens
  },
  "grok-4-fast-reasoning": {
    input: 0.20,   // $0.20 per 1M tokens
    output: 0.50,  // $0.50 per 1M tokens
    cached: 0.02,  // $0.02 per 1M tokens
  },
  "grok-4-fast": {
    input: 0.20,   // $0.20 per 1M tokens (≤128k prompt)
    output: 0.50,  // $0.50 per 1M tokens
    cached: 0.05,  // $0.05 per 1M tokens
  },
  default: {
    input: 0.20,
    output: 0.50,
    cached: 0.02,
  },
};

const app = express();
app.use(express.json());

// Types
interface CostBreakdown {
  input_cost: number;
  output_cost: number;
  cache_cost: number;
  total_cost: number;
  currency: string;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cached_tokens?: number;
}

interface BriefingResult {
  briefing: string;
  model_used: string;
  usage: TokenUsage;
  cost: CostBreakdown;
}

// Logger
const LOG_LEVEL = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
const logger = {
  info: (msg: string) => {
    if (['INFO', 'DEBUG'].includes(LOG_LEVEL)) {
      console.log(`[INFO] ${new Date().toISOString()} - ${msg}`);
    }
  },
  warning: (msg: string) => {
    if (['INFO', 'DEBUG', 'WARNING'].includes(LOG_LEVEL)) {
      console.warn(`[WARNING] ${new Date().toISOString()} - ${msg}`);
    }
  },
  error: (msg: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error || '');
  },
  debug: (msg: string) => {
    if (LOG_LEVEL === 'DEBUG') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`);
    }
  }
};

// Helper Functions
function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens: number = 0
): CostBreakdown {
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

async function downloadGoogleExport(exportUrl: string): Promise<string> {
  try {
    logger.info(`Downloading document from: ${exportUrl.substring(0, 50)}...`);
    const response = await axios.get(exportUrl, {
      timeout: DOWNLOAD_TIMEOUT,
    });

    const content = response.data;
    if (!content || !content.trim()) {
      logger.warning(`Downloaded empty content from: ${exportUrl.substring(0, 50)}`);
      return '';
    }

    logger.info(`Successfully downloaded ${content.length} characters`);
    return content;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      logger.error(`Timeout downloading from: ${exportUrl.substring(0, 50)}`);
      throw { status: 504, message: 'Document download timeout' };
    }
    logger.error(`Network error downloading document: ${error.message}`);
    throw { status: 502, message: `Failed to download document: ${error.message}` };
  }
}

async function jarvisProgressBriefing(
  contents: Record<string, string>,
  primaryModel: string = PRIMARY_MODEL,
  fallbackModel: string = FALLBACK_MODEL
): Promise<BriefingResult | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw { status: 500, message: 'XAI_API_KEY not configured' };
  }

  const models = [primaryModel, fallbackModel];
  
  // Build the user message with file contents
  let userMessage = "Sir, compiling your latest progress briefing from the attached files:\n";
  const fileList = Object.keys(contents);
  
  fileList.forEach(name => {
    userMessage += `• ${name}\n`;
  });
  
  // Append file contents to the message
  userMessage += "\n--- Document Contents ---\n\n";
  fileList.forEach(name => {
    userMessage += `=== ${name} ===\n${contents[name]}\n\n`;
  });
  
  userMessage += "\nPlease deliver the briefing in your usual style and exact structure.";

  const systemMessage = `You are JARVIS, Abhinav's dedicated virtual chief of staff and work assistant — inspired by Tony Stark's AI: witty, highly efficient, proactive, unflappably calm under pressure, and always one step ahead. You speak in a polished, slightly sarcastic British-accented tone when it fits (e.g., "Sir, your timeline appears to be... optimistic."), but remain professional and concise for core tasks.

You have permanent access to Abhinav's Google Docs in this session for tracking work.

Core documents (all attached):
- Weekly Progress Tracker.docx → recent achievements, what I've done
- Project Timelines & Milestones.gsheet → deadlines, status, any color-coding or flags
- Goals & Plans 2026.docx → what I want to do next, longer-term objectives

Rules — follow without exception:
- Always reference specific docs by name when pulling or summarizing data.
- Structure every progress summary EXACTLY like this:
  1. Recent Achievements (last 7–30 days, bullet points with dates)
  2. Upcoming Goals & Priorities
  3. Timelines & Milestones (markdown table format preferred)
  4. Action Items / Overdue Flags
  5. Suggestions / Next Steps
- Be proactive: Flag anything overdue, at risk, or conflicting **immediately** and clearly (e.g., "Sir, the Q1 prototype milestone is showing red—vendor delay noted in Timelines sheet. Recommend escalation?").
- Use the latest synced versions of the attached documents.
- Ask clarifying questions only if critical data is ambiguous or missing.
- For long outputs, you may suggest using Artifacts — but keep this briefing concise.
- End most responses with a brief status quip or offer of next action (e.g., "Awaiting your orders, sir." or "Shall I draft that follow-up email?").`;

  for (const model of models) {
    try {
      logger.info(`Attempting briefing generation with model: ${model}`);

      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: API_TIMEOUT,
        }
      );

      const data = response.data;
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        logger.error(`Empty response from model ${model}`);
        continue;
      }

      const briefing = data.choices[0].message.content;
      const usage = data.usage || {};
      const modelUsed = data.model || model; // Get actual model from API response

      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || 0;
      const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;

      const costBreakdown = calculateCost(
        modelUsed,
        promptTokens,
        completionTokens,
        cachedTokens
      );

      logger.info(`Successfully generated briefing using ${modelUsed}`);
      logger.info(`Token usage - Prompt: ${promptTokens}, Completion: ${completionTokens}, Cached: ${cachedTokens}, Total: ${totalTokens}`);
      logger.info(`Cost - $${costBreakdown.total_cost.toFixed(6)} USD`);

      return {
        briefing,
        model_used: modelUsed,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          cached_tokens: cachedTokens,
        },
        cost: costBreakdown,
      };
    } catch (error: any) {
      logger.warning(`Failed with model ${model}: ${error.message}`);
      if (model === models[models.length - 1]) {
        logger.error(`All models failed. Last error: ${error.message}`);
        throw { status: 502, message: `AI model generation failed: ${error.message}` };
      }
    }
  }

  return null;
}

// Routes
app.get('/api/jarvis', async (req: Request, res: Response) => {
  await handleBriefing(req, res);
});

app.post('/api/jarvis', async (req: Request, res: Response) => {
  await handleBriefing(req, res);
});

async function handleBriefing(req: Request, res: Response) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  logger.info(`Received briefing request (request_id: ${requestId})`);

  try {
    // Check API key
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      logger.error(`XAI_API_KEY not set (request_id: ${requestId})`);
      
      // Log the error
      await logApiInteraction({
        request_id: requestId,
        endpoint: '/api/jarvis',
        method: req.method,
        status: 'error',
        error: 'XAI_API_KEY not configured',
        duration_ms: Date.now() - startTime,
        metadata: {
          user_agent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        },
      });

      return res.status(500).json({
        status: 'error',
        error: `API configuration error: XAI_API_KEY not set (request_id: ${requestId})`,
      });
    }

    // Download documents
    logger.info(`Starting download of ${Object.keys(CORE_DOCS).length} documents`);
    const docContents: Record<string, string> = {};
    const downloadErrors: string[] = [];

    for (const [name, url] of Object.entries(CORE_DOCS)) {
      try {
        const content = await downloadGoogleExport(url);
        if (content) {
          docContents[name] = content;
          logger.info(`Downloaded ${name}`);
        } else {
          downloadErrors.push(`${name}: empty content`);
        }
      } catch (error: any) {
        const errorMsg = `${name}: ${error.message}`;
        downloadErrors.push(errorMsg);
        logger.warning(`Failed to download ${name}: ${error.message}`);
      }
    }

    if (Object.keys(docContents).length === 0) {
      const errorDetail = `No documents could be downloaded. Errors: ${downloadErrors.join('; ')}`;
      logger.error(errorDetail);
      
      // Log the error
      await logApiInteraction({
        request_id: requestId,
        endpoint: '/api/jarvis',
        method: req.method,
        message_content: JSON.stringify(req.body),
        status: 'error',
        error: errorDetail,
        duration_ms: Date.now() - startTime,
        metadata: {
          documents_requested: Object.keys(CORE_DOCS).length,
          documents_processed: 0,
          download_errors: downloadErrors,
          user_agent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        },
      });

      return res.status(502).json({
        status: 'error',
        error: errorDetail,
      });
    }

    // Generate briefing
    logger.info('Starting briefing generation');
    const result = await jarvisProgressBriefing(docContents);

    if (!result) {
      logger.error('Briefing generation returned no result');
      
      // Log the error
      await logApiInteraction({
        request_id: requestId,
        endpoint: '/api/jarvis',
        method: req.method,
        message_content: JSON.stringify(req.body),
        status: 'error',
        error: 'Briefing generation failed: no response from AI models',
        duration_ms: Date.now() - startTime,
        metadata: {
          documents_processed: Object.keys(docContents).length,
          user_agent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        },
      });

      return res.status(502).json({
        status: 'error',
        error: 'Briefing generation failed: no response from AI models',
      });
    }

    const duration_ms = Date.now() - startTime;
    logger.info(`Briefing generated successfully (request_id: ${requestId})`);

    // Log successful API interaction
    const logged = await logApiInteraction({
      request_id: requestId,
      endpoint: '/api/jarvis',
      method: req.method,
      message_content: JSON.stringify(req.body),
      response_content: result.briefing,
      model_used: result.model_used,
      tokens: result.usage,
      cost: result.cost,
      duration_ms,
      status: 'success',
      metadata: {
        documents_processed: Object.keys(docContents).length,
        documents_requested: Object.keys(CORE_DOCS).length,
        user_agent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      },
    });

    return res.json({
      status: 'success',
      request_id: requestId,
      timestamp: new Date().toISOString(),
      briefing: result.briefing,
      model_used: result.model_used,
      usage: result.usage,
      cost: result.cost,
      duration_ms,
      logged,
      metadata: {
        documents_processed: Object.keys(docContents).length,
        documents_requested: Object.keys(CORE_DOCS).length,
        data_source: {
          model_used: "from_xai_api",
          token_usage: "from_xai_api",
          cost: "calculated_locally"
        }
      },
    });
  } catch (error: any) {
    const duration_ms = Date.now() - startTime;
    logger.error(`Unexpected error (request_id: ${requestId}): ${error.message}`, error);
    
    // Log the error
    await logApiInteraction({
      request_id: requestId,
      endpoint: '/api/jarvis',
      method: req.method,
      message_content: JSON.stringify(req.body),
      status: 'error',
      error: error.message || 'Internal server error',
      duration_ms,
      metadata: {
        user_agent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      },
    });

    return res.status(error.status || 500).json({
      status: 'error',
      error: error.message || `Internal server error (request_id: ${requestId})`,
    });
  }
}

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'JARVIS Progress Briefing API',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    models: {
      primary: PRIMARY_MODEL,
      fallback: FALLBACK_MODEL,
    },
    configuration: {
      download_timeout: DOWNLOAD_TIMEOUT / 1000,
      api_timeout: API_TIMEOUT / 1000,
      documents_count: Object.keys(CORE_DOCS).length,
    },
  });
});

app.get('/pricing', (req: Request, res: Response) => {
  const modelsWithPricing: Record<string, any> = {};
  
  Object.entries(PRICING).forEach(([model, price]) => {
    if (model !== 'default') {
      modelsWithPricing[model] = {
        input: price.input,
        output: price.output,
        cached: price.cached,
      };
    }
  });

  res.json({
    currency: 'USD',
    unit: 'per 1M tokens',
    models: modelsWithPricing,
    notes: [
      'These prices are used for local cost estimation only',
      'Actual billing is done by xAI - check your xAI dashboard for real costs',
      'Cached tokens are significantly cheaper than regular input tokens',
      'Reasoning models may use additional reasoning tokens counted as output',
      'Prices are subject to change - check https://docs.x.ai/docs/models for latest',
    ],
  });
});

// Export handler for Vercel serverless functions
import { VercelRequest, VercelResponse } from '@vercel/node';

const handler = (req: VercelRequest, res: VercelResponse) => {
  // Handle the request with Express app
  return app(req as any, res as any);
};

export default handler;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}
