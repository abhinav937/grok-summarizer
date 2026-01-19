"""
JARVIS Progress Briefing API Endpoint for Vercel
- Trigger via HTTP (e.g., GET /api/jarvis)
- Returns JSON with briefing, stats, etc.
"""

import os
import requests
from fastapi import FastAPI, HTTPException
from xai_sdk import Client
from xai_sdk.chat import user, system, file

# Configuration – your core documents (public export links)
CORE_DOCS = {
    "Weekly Progress Tracker.docx":
        "https://docs.google.com/document/d/YOUR_WEEKLY_TRACKER_DOC_ID/export?format=txt",

    "Project Timelines & Milestones.gsheet":
        "https://docs.google.com/spreadsheets/d/YOUR_TIMELINES_SHEET_ID/export?format=csv",

    "Goals & Plans 2026.docx":
        "https://docs.google.com/document/d/YOUR_GOALS_2026_DOC_ID/export?format=txt"
}

PRIMARY_MODEL = "grok-4-1-fast-reasoning"
FALLBACK_MODEL = "grok-4-fast-reasoning"

app = FastAPI()

def download_google_export(export_url: str) -> str:
    try:
        resp = requests.get(export_url, timeout=30)
        resp.raise_for_status()
        return resp.text
    except Exception:
        return ""

def upload_file(client: Client, content: str, filename: str) -> str | None:
    if not content.strip():
        return None
    try:
        uploaded = client.files.upload(
            content.encode('utf-8'),
            filename=filename
        )
        return uploaded.id
    except Exception:
        return None

def jarvis_progress_briefing(
    client: Client,
    file_ids: dict[str, str],
    primary_model: str = PRIMARY_MODEL,
    fallback_model: str = FALLBACK_MODEL
) -> dict | None:
    models = [primary_model, fallback_model]
    file_attachments = []
    user_text = "Sir, compiling your latest progress briefing from the attached files:\n"
    for name, fid in file_ids.items():
        if fid:
            user_text += f"• {name}\n"
            file_attachments.append(file(fid))
    user_text += "\nPlease deliver the briefing in your usual style and exact structure."

    for model in models:
        try:
            chat = client.chat.create(model=model, timeout=180)
            chat.append(system(
                """You are JARVIS, Abhinav's dedicated virtual chief of staff and work assistant — inspired by Tony Stark's AI: witty, highly efficient, proactive, unflappably calm under pressure, and always one step ahead. You speak in a polished, slightly sarcastic British-accented tone when it fits (e.g., "Sir, your timeline appears to be... optimistic."), but remain professional and concise for core tasks.

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
- End most responses with a brief status quip or offer of next action (e.g., "Awaiting your orders, sir." or "Shall I draft that follow-up email?")."""
            ))
            chat.append(user(user_text, *file_attachments))
            response = chat.sample()
            return {
                "briefing": response.content,
                "model_used": model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "reasoning_tokens": getattr(response.usage.completion_tokens_details, 'reasoning_tokens', 0) if hasattr(response.usage, 'completion_tokens_details') else 0,
                    "total_tokens": response.usage.total_tokens
                }
            }
        except Exception:
            if model == models[-1]:
                raise
    return None

def cleanup_files(client: Client, file_ids: list[str]):
    for fid in file_ids:
        if fid:
            try:
                client.files.delete(fid)
            except Exception:
                pass

@app.get("/")
@app.post("/")  # Supports GET or POST for triggering
def generate_briefing():
    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="XAI_API_KEY not set")

    client = Client(api_key=api_key, timeout=180)
    uploaded_file_ids = {}

    try:
        # Download docs
        doc_contents = {}
        for name, url in CORE_DOCS.items():
            content = download_google_export(url)
            if content:
                doc_contents[name] = content

        if not doc_contents:
            raise HTTPException(status_code=500, detail="No documents downloaded")

        # Upload files
        for name, content in doc_contents.items():
            ext = ".csv" if "gsheet" in name else ".txt"
            fid = upload_file(client, content, name.replace(".docx", ".txt").replace(".gsheet", ".csv"))
            if fid:
                uploaded_file_ids[name] = fid

        if not uploaded_file_ids:
            raise HTTPException(status_code=500, detail="No files uploaded")

        # Generate briefing
        result = jarvis_progress_briefing(client, uploaded_file_ids)
        if not result:
            raise HTTPException(status_code=500, detail="Briefing generation failed")

        return {
            "status": "success",
            "briefing": result["briefing"],
            "model_used": result["model_used"],
            "usage": result["usage"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if uploaded_file_ids:
            cleanup_files(client, list(uploaded_file_ids.values()))