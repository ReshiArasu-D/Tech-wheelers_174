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

# Enable CORS for React frontend (both local Vite/React and deployed cloud URLs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
