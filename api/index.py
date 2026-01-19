"""
Vercel Serverless Function Entry Point
This file is required for Vercel to detect and deploy the FastAPI application.
"""

import sys
import os
from importlib.util import spec_from_file_location, module_from_spec

# Get the path to jarvis.py
project_root = os.path.dirname(os.path.dirname(__file__))
jarvis_path = os.path.join(project_root, 'jarvis-api', 'api', 'jarvis.py')

# Load the module dynamically
spec = spec_from_file_location("jarvis", jarvis_path)
jarvis_module = module_from_spec(spec)
sys.modules["jarvis"] = jarvis_module
spec.loader.exec_module(jarvis_module)

# Get the app instance
app = jarvis_module.app

# Vercel will use this app instance
handler = app
