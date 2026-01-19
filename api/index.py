"""
Vercel Serverless Function Entry Point
This file is required for Vercel to detect and deploy the FastAPI application.
"""

from jarvis_api.api.jarvis import app

# Vercel will use this app instance
handler = app
