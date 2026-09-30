"""
FastAPI Router for Generative Intelligence Layer.
Endpoints:
- POST /ai/summary : Generates a structured operational summary for current dashboard state
- POST /ai/chat    : Answers contextual nowcasting questions from duty operators
"""
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas.ai import (
    AISummaryRequest, AISummaryResponse,
    AIChatRequest, AIChatResponse
)
from backend.app.services.ai_assistant import ai_assistant_service

router = APIRouter(prefix="/ai", tags=["Generative Intelligence Layer"])

@router.post("/summary", response_model=AISummaryResponse)
async def generate_operational_summary(request: AISummaryRequest):
    """
    Generates an executive operational nowcast summary grounded strictly in the
    active dashboard telemetry.
    """
    try:
        return await ai_assistant_service.generate_summary(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate operational summary: {str(e)}")

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_assistant(request: AIChatRequest):
    """
    Answers questions regarding the active nowcast frame, horizons, hazards,
    arrival timers, and risk scores.
    """
    try:
        return await ai_assistant_service.chat(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to answer assistant query: {str(e)}")
