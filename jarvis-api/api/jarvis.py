"""
JARVIS Progress Briefing API Endpoint for Vercel
- Trigger via HTTP (e.g., GET /api/jarvis)
- Returns JSON with briefing, stats, token usage, and cost

Required Environment Variables:
- XAI_API_KEY: Your xAI API key from console.x.ai

Optional Environment Variables:
- LOG_LEVEL: Logging level (default: INFO)
- DOWNLOAD_TIMEOUT: Timeout for document downloads in seconds (default: 30)
- API_TIMEOUT: Timeout for xAI API calls in seconds (default: 180)
"""

from __future__ import annotations

import os
import logging
import requests
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException
from xai_sdk import Client
from xai_sdk.chat import user, system, file

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level))
logger = logging.getLogger(__name__)

# Configuration – your core documents (public export links)
CORE_DOCS = {
    "Weekly Progress Tracker.docx":
        "https://docs.google.com/document/d/1ns8g0pHyD6gchd8-ZyWlMDxov-DzxoOY0aOgv1NpZOE/export?format=txt",
}

PRIMARY_MODEL = "grok-4-1-fast-reasoning"
FALLBACK_MODEL = "grok-4-fast-reasoning"

# Configurable timeouts
DOWNLOAD_TIMEOUT = int(os.getenv("DOWNLOAD_TIMEOUT", "30"))
API_TIMEOUT = int(os.getenv("API_TIMEOUT", "180"))

# Pricing per 1M tokens (as of xAI pricing page)
# https://docs.x.ai/docs/models
PRICING = {
    "grok-4-1-fast-reasoning": {
        "input": 2.00,      # $2.00 per 1M input tokens
        "output": 10.00,    # $10.00 per 1M output tokens
        "cached": 0.20,     # $0.20 per 1M cached tokens
    },
    "grok-4-fast-reasoning": {
        "input": 2.00,      # $2.00 per 1M input tokens
        "output": 10.00,    # $10.00 per 1M output tokens
        "cached": 0.20,     # $0.20 per 1M cached tokens
    },
    "grok-4-fast": {
        "input": 0.50,      # $0.50 per 1M input tokens
        "output": 1.50,     # $1.50 per 1M output tokens
        "cached": 0.05,     # $0.05 per 1M cached tokens
    },
    # Default fallback pricing
    "default": {
        "input": 2.00,
        "output": 10.00,
        "cached": 0.20,
    }
}

app = FastAPI()

def calculate_cost(
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    cached_tokens: int = 0
) -> Dict[str, float]:
    """
    Calculate the cost of API usage based on token counts.

    Args:
        model: Model name used
        prompt_tokens: Number of input/prompt tokens
        completion_tokens: Number of output/completion tokens
        cached_tokens: Number of cached prompt tokens

    Returns:
        Dictionary with cost breakdown
    """
    # Get pricing for the model, fallback to default if not found
    pricing = PRICING.get(model, PRICING["default"])

    # Calculate costs (pricing is per 1M tokens)
    input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output"]
    cache_cost = (cached_tokens / 1_000_000) * pricing["cached"]

    total_cost = input_cost + output_cost + cache_cost

    return {
        "input_cost": round(input_cost, 6),
        "output_cost": round(output_cost, 6),
        "cache_cost": round(cache_cost, 6),
        "total_cost": round(total_cost, 6),
        "currency": "USD"
    }

def download_google_export(export_url: str) -> str:
    """Download content from Google Docs export URL with proper error handling."""
    try:
        logger.info(f"Downloading document from: {export_url[:50]}...")
        resp = requests.get(export_url, timeout=DOWNLOAD_TIMEOUT)
        resp.raise_for_status()
        content = resp.text
        if not content.strip():
            logger.warning(f"Downloaded empty content from: {export_url[:50]}")
            return ""
        logger.info(f"Successfully downloaded {len(content)} characters")
        return content
    except requests.exceptions.Timeout:
        logger.error(f"Timeout downloading from: {export_url[:50]}")
        raise HTTPException(status_code=504, detail="Document download timeout")
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error downloading document: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Failed to download document: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document download failed: {str(e)}")

def upload_file(client: Client, content: str, filename: str) -> Optional[str]:
    """Upload content to XAI with proper error handling."""
    if not content.strip():
        logger.warning(f"Skipping upload of empty content for {filename}")
        return None

    try:
        logger.info(f"Uploading file: {filename} ({len(content)} characters)")
        uploaded = client.files.upload(
            content.encode('utf-8'),
            filename=filename
        )
        if not uploaded or not uploaded.id:
            logger.error(f"Upload failed for {filename}: no file ID returned")
            return None
        logger.info(f"Successfully uploaded {filename} with ID: {uploaded.id}")
        return uploaded.id
    except Exception as e:
        logger.error(f"Failed to upload {filename}: {str(e)}")
        raise HTTPException(status_code=502, detail=f"File upload failed for {filename}: {str(e)}")

def jarvis_progress_briefing(
    client: Client,
    file_ids: Dict[str, str],
    primary_model: str = PRIMARY_MODEL,
    fallback_model: str = FALLBACK_MODEL
) -> Optional[Dict]:
    """Generate JARVIS briefing with proper error handling and fallback models."""
    models = [primary_model, fallback_model]
    file_attachments = []
    user_text = "Sir, compiling your latest progress briefing from the attached files:\n"

    # Build file attachments list
    valid_files = []
    for name, fid in file_ids.items():
        if fid:
            user_text += f"• {name}\n"
            file_attachments.append(file(fid))
            valid_files.append(name)

    if not valid_files:
        logger.error("No valid file IDs provided for briefing generation")
        raise HTTPException(status_code=400, detail="No valid files available for briefing generation")

    user_text += "\nPlease deliver the briefing in your usual style and exact structure."
    logger.info(f"Generating briefing with {len(valid_files)} files using models: {models}")

    for model in models:
        try:
            logger.info(f"Attempting briefing generation with model: {model}")
            chat = client.chat.create(model=model, timeout=180)
            chat.append(system(
                """You are JARVIS, Abhinav's dedicated virtual chief of staff and work assistant — inspired by Tony Stark's AI: witty, highly efficient, proactive, unflappably calm under pressure, and always one step ahead. You speak in a polished, slightly sarcastic British-accented tone when it fits (e.g., \"Sir, your timeline appears to be... optimistic.\"), but remain professional and concise for core tasks.

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
- Be proactive: Flag anything overdue, at risk, or conflicting **immediately** and clearly (e.g., \"Sir, the Q1 prototype milestone is showing red—vendor delay noted in Timelines sheet. Recommend escalation?\").
- Use the latest synced versions of the attached documents.
- Ask clarifying questions only if critical data is ambiguous or missing.
- For long outputs, you may suggest using Artifacts — but keep this briefing concise.
- End most responses with a brief status quip or offer of next action (e.g., \"Awaiting your orders, sir.\" or \"Shall I draft that follow-up email?\").
"""
            ))
            chat.append(user(user_text, *file_attachments))
            response = chat.sample()

            if not response or not response.content:
                logger.error(f"Empty response from model {model}")
                continue

            # Extract usage statistics
            prompt_tokens = getattr(response.usage, 'prompt_tokens', 0)
            completion_tokens = getattr(response.usage, 'completion_tokens', 0)
            total_tokens = getattr(response.usage, 'total_tokens', 0)

            # Get cached tokens
            cached_tokens = 0
            if hasattr(response.usage, 'prompt_tokens_details'):
                prompt_details = response.usage.prompt_tokens_details
                if prompt_details:
                    cached_tokens = getattr(prompt_details, 'cached_tokens', 0)

            # Get reasoning tokens
            reasoning_tokens = 0
            if hasattr(response.usage, 'completion_tokens_details'):
                completion_details = response.usage.completion_tokens_details
                if completion_details:
                    reasoning_tokens = getattr(completion_details, 'reasoning_tokens', 0)

            # Calculate cost
            cost_breakdown = calculate_cost(
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cached_tokens=cached_tokens
            )

            result = {
                "briefing": response.content,
                "model_used": model,
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "reasoning_tokens": reasoning_tokens,
                    "cached_tokens": cached_tokens,
                    "total_tokens": total_tokens
                },
                "cost": cost_breakdown
            }

            logger.info(f"Successfully generated briefing using {model}")
            logger.info(f"Token usage - Prompt: {prompt_tokens}, Completion: {completion_tokens}, Cached: {cached_tokens}, Total: {total_tokens}")
            logger.info(f"Cost - ${cost_breakdown['total_cost']:.6f} USD")

            return result

        except Exception as e:
            logger.warning(f"Failed with model {model}: {str(e)}")
            if model == models[-1]:  # Last model failed
                logger.error(f"All models failed. Last error: {str(e)}")
                raise HTTPException(status_code=502, detail=f"AI model generation failed: {str(e)}")

    logger.error("No models were successful")
    return None

def cleanup_files(client: Client, file_ids: List[str]):
    """Clean up uploaded files with proper error handling."""
    if not file_ids:
        return

    logger.info(f"Cleaning up {len(file_ids)} files")
    for fid in file_ids:
        if fid:
            try:
                client.files.delete(fid)
                logger.debug(f"Deleted file: {fid}")
            except Exception as e:
                logger.warning(f"Failed to delete file {fid}: {str(e)}")

@app.get("/api/")
@app.post("/api/")  # Supports GET or POST for triggering
def generate_briefing():
    """Generate JARVIS progress briefing with comprehensive error handling."""
    request_id = str(uuid.uuid4())
    logger.info(f"Received briefing request (request_id: {request_id})")

    # Initialize variables
    client = None
    uploaded_file_ids = {}

    # Check API key
    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        timestamp = datetime.utcnow().isoformat()
        logger.error(f"XAI_API_KEY not set (request_id: {request_id})")
        raise HTTPException(
            status_code=500,
            detail=f"API configuration error: XAI_API_KEY not set (request_id: {request_id})"
        )

    try:
        client = Client(api_key=api_key, timeout=API_TIMEOUT)
        logger.info("Initialized XAI client")
    except Exception as e:
        timestamp = datetime.utcnow().isoformat()
        logger.error(f"Failed to initialize XAI client (request_id: {request_id}): {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"API client initialization failed (request_id: {request_id})"
        )

    try:
        # Download documents
        logger.info(f"Starting download of {len(CORE_DOCS)} documents")
        doc_contents = {}
        download_errors = []

        for name, url in CORE_DOCS.items():
            try:
                content = download_google_export(url)
                if content:
                    doc_contents[name] = content
                    logger.info(f"Downloaded {name}")
                else:
                    download_errors.append(f"{name}: empty content")
            except HTTPException:
                # download_google_export already raises HTTPException, so re-raise it
                raise
            except Exception as e:
                error_msg = f"{name}: {str(e)}"
                download_errors.append(error_msg)
                logger.warning(f"Failed to download {name}: {str(e)}")

        if len(doc_contents) < len(CORE_DOCS):
            logger.warning(f"Only {len(doc_contents)}/{len(CORE_DOCS)} documents downloaded")
            if download_errors:
                logger.warning(f"Download errors: {'; '.join(download_errors)}")

        if not doc_contents:
            error_detail = "No documents could be downloaded"
            if download_errors:
                error_detail += f". Errors: {'; '.join(download_errors)}"
            logger.error(error_detail)
            raise HTTPException(status_code=502, detail=error_detail)

        # Upload files
        logger.info(f"Uploading {len(doc_contents)} documents to XAI")
        upload_errors = []

        for name, content in doc_contents.items():
            try:
                ext = ".csv" if "gsheet" in name else ".txt"
                filename = name.replace(".docx", ".txt").replace(".gsheet", ".csv")
                fid = upload_file(client, content, filename)
                if fid:
                    uploaded_file_ids[name] = fid
                    logger.info(f"Uploaded {name}")
                else:
                    upload_errors.append(f"{name}: upload returned no file ID")
            except HTTPException:
                # upload_file already raises HTTPException, so re-raise it
                raise
            except Exception as e:
                error_msg = f"{name}: {str(e)}"
                upload_errors.append(error_msg)
                logger.warning(f"Failed to upload {name}: {str(e)}")

        if not uploaded_file_ids:
            error_detail = "No files could be uploaded to XAI"
            if upload_errors:
                error_detail += f". Errors: {'; '.join(upload_errors)}"
            logger.error(error_detail)
            raise HTTPException(status_code=502, detail=error_detail)

        # Generate briefing
        logger.info("Starting briefing generation")
        result = jarvis_progress_briefing(client, uploaded_file_ids)
        if not result:
            logger.error("Briefing generation returned no result")
            raise HTTPException(status_code=502, detail="Briefing generation failed: no response from AI models")

        logger.info(f"Briefing generated successfully (request_id: {request_id})")

        return {
            "status": "success",
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
            "briefing": result["briefing"],
            "model_used": result["model_used"],
            "usage": result["usage"],
            "cost": result["cost"],
            "metadata": {
                "documents_processed": len(uploaded_file_ids),
                "documents_requested": len(CORE_DOCS)
            }
        }

    except HTTPException:
        # Re-raise HTTPExceptions as they already have proper status codes and messages
        raise
    except Exception as e:
        timestamp = datetime.utcnow().isoformat()
        logger.error(f"Unexpected error (request_id: {request_id}): {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error (request_id: {request_id}): {str(e)}"
        )

    finally:
        # Always cleanup files, even if there were errors
        if uploaded_file_ids and client:
            try:
                cleanup_files(client, list(uploaded_file_ids.values()))
                logger.info("File cleanup completed")
            except Exception as e:
                logger.warning(f"File cleanup failed: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint to verify API is running."""
    return {
        "status": "healthy",
        "service": "JARVIS Progress Briefing API",
        "version": "1.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "primary": PRIMARY_MODEL,
            "fallback": FALLBACK_MODEL
        },
        "configuration": {
            "download_timeout": DOWNLOAD_TIMEOUT,
            "api_timeout": API_TIMEOUT,
            "documents_count": len(CORE_DOCS)
        },
        "pricing_info": {
            "note": "Prices shown are per 1M tokens",
            "models": {
                model: {
                    "input_per_1m": f"${{price['input']:.2f}}",
                    "output_per_1m": f"${{price['output']:.2f}}",
                    "cached_per_1m": f"${{price['cached']:.2f}}"
                }
                for model, price in PRICING.items() if model != "default"
            }
        }
    }

@app.get("/pricing")
def get_pricing():
    """Get current pricing information for all models."""
    return {
        "currency": "USD",
        "unit": "per 1M tokens",
        "models": {
            model: {
                "input": price['input'],
                "output": price['output'],
                "cached": price['cached']
            }
            for model, price in PRICING.items() if model != "default"
        },
        "notes": [
            "Cached tokens are significantly cheaper than regular input tokens",
            "Reasoning models may use additional reasoning tokens counted as output",
            "Prices are subject to change - check https://docs.x.ai/docs/models for latest"
        ]
    }
