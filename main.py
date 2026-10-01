"""
CO-NOWCAST Root Entrypoint for Vercel Deployment
Exposes the FastAPI 'app' instance from backend.app.main
"""
import os
import sys

# Ensure repository root is in sys.path so backend modules import properly
root_dir = os.path.dirname(os.path.abspath(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app

# Standard variable name for Vercel / ASGI servers
application = app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
