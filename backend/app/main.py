"""
CO-NOWCAST Backend Server (FastAPI)
SIH 2026 Problem Statement 26084:
Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0–6 hr)
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.services.satellite import satellite_service
from backend.app.services.forecasting import forecasting_pipeline

from backend.app.api.health import router as health_router
from backend.app.api.events import router as events_router
from backend.app.api.storms import router as storms_router
from backend.app.api.forecast import router as forecast_router
from backend.app.api.hazards import router as hazards_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.ai import router as ai_router
from backend.app.api.ws import router as ws_router
from backend.app.api.dwr_replay import router as dwr_replay_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    init_db()
    # Warm up indexing and pipeline cache
    ts = satellite_service.get_available_timestamps()
    if ts:
        print(f"Indexed {len(ts)} real INSAT-3D historical frames.")
        # Pre-run baseline pipeline for middle frame so first request is immediate
        try:
            forecasting_pipeline.run_pipeline_for_frame(ts[min(4, len(ts) - 1)])
            print("Pre-warmed pipeline state for frame:", ts[min(4, len(ts) - 1)])
        except Exception as e:
            print("Pipeline pre-warm note:", e)
    yield

app = FastAPI(
    title="CO-NOWCAST API",
    description="Scientific 0–6 hour Convective Scale Nowcasting Decision Support System",
    version="0.1.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vercel deployments, Render, and local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router)
app.include_router(events_router)
app.include_router(storms_router)
app.include_router(forecast_router)
app.include_router(hazards_router)
app.include_router(alerts_router)
app.include_router(ai_router)
app.include_router(ws_router)
app.include_router(dwr_replay_router)

# ── Serve Built Frontend SPA (Unified Single-Service Deployment on Render) ───
frontend_dist = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.isdir(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path:
            file_path = os.path.join(frontend_dist, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "title": "CO-NOWCAST API",
            "description": "Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0-6 hr)",
            "version": "convnowcast-v0.1",
            "docs_url": "/docs",
            "health_url": "/health"
        }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
