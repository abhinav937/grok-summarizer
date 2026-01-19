# API Data Sources

This document explains what data comes from the xAI API vs. what is calculated locally.

## Data from xAI API ✅

The following data is **returned directly by the xAI API** and is accurate:

### 1. Model Name
- **Field**: `model_used`
- **Source**: `data.model` from API response
- **Example**: `"grok-4-1-fast-reasoning"`

### 2. Token Usage
- **Fields**: 
  - `prompt_tokens` - Input tokens
  - `completion_tokens` - Output tokens
  - `total_tokens` - Total tokens
  - `cached_tokens` - Cached prompt tokens
- **Source**: `data.usage` from API response
- **Example**: 
  ```json
  {
    "prompt_tokens": 2321,
    "completion_tokens": 817,
    "total_tokens": 3863,
    "cached_tokens": 149
  }
  ```

### 3. Briefing Content
- **Field**: `briefing`
- **Source**: `data.choices[0].message.content` from API response
- **This is the actual AI-generated response**

## Data Calculated Locally 🧮

The following data is **calculated by our code** using pricing information:

### Cost Breakdown
- **Fields**: 
  - `input_cost`
  - `output_cost`
  - `cache_cost`
  - `total_cost`
- **Source**: Calculated using:
  - Token counts from API
  - Pricing constants defined in code:
    ```typescript
    const PRICING = {
      "grok-4-1-fast-reasoning": {
        input: 0.20,   // $0.20 per 1M tokens
        output: 0.50,  // $0.50 per 1M tokens
        cached: 0.02,  // $0.02 per 1M tokens
      }
    }
    ```
- **Formula**: 
  ```
  input_cost = (prompt_tokens / 1,000,000) × $0.20
  output_cost = (completion_tokens / 1,000,000) × $0.50
  cache_cost = (cached_tokens / 1,000,000) × $0.02
  total_cost = input_cost + output_cost + cache_cost
  ```

## Important Notes

⚠️ **Cost Estimates vs. Actual Billing**
- The costs shown in API responses are **estimates** based on published pricing
- Your actual xAI bill may differ due to:
  - Pricing changes
  - Account-specific rates
  - Billing tiers or discounts
- **Always check your xAI dashboard for actual costs**

✅ **Token Counts are Accurate**
- Token usage numbers come directly from xAI API
- These are the exact tokens used for your request

✅ **Model Name is Accurate**
- The actual model used is returned by xAI API
- If xAI uses a different model (fallback, etc.), it will be reflected

## API Response Structure

```json
{
  "status": "success",
  "model_used": "← FROM API",
  "usage": {
    "prompt_tokens": "← FROM API",
    "completion_tokens": "← FROM API",
    "total_tokens": "← FROM API",
    "cached_tokens": "← FROM API"
  },
  "cost": {
    "input_cost": "← CALCULATED",
    "output_cost": "← CALCULATED",
    "cache_cost": "← CALCULATED",
    "total_cost": "← CALCULATED"
  },
  "metadata": {
    "data_source": {
      "model_used": "from_xai_api",
      "token_usage": "from_xai_api",
      "cost": "calculated_locally"
    }
  }
}
```

## Verifying Costs

To verify actual costs:
1. Go to [xAI Console](https://console.x.ai)
2. Check your usage dashboard
3. Compare with the API estimates

The token counts should match exactly, but the dollar amounts may vary slightly.
