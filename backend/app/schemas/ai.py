"""
Pydantic schemas for the Generative Intelligence Layer.
Includes request and response models for:
- Operational AI Summaries
- Context-Aware AI Chat Assistant
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class AISummaryRequest(BaseModel):
    event_id: Optional[str] = Field(None, description="Event ID, e.g. EVENT-20191107-BOB-01")
    timestamp: Optional[str] = Field(None, description="Current frame timestamp in ISO format")
    selected_horizon: Optional[str] = Field("NOW", description="Active horizon, e.g. NOW, 15m, 30m, 60m, 180m, 360m")
    selected_model: Optional[str] = Field("CONVGRU", description="Active forecast model")
    dashboard_context: Optional[Dict[str, Any]] = Field(None, description="Full real-time telemetry from frontend dashboard")

class AISummarySection(BaseModel):
    title: str
    content: str

class AISummaryResponse(BaseModel):
    status: str = "success"
    timestamp: str
    selected_horizon: str
    provider: str
    model_name: str
    generated_at: str
    sections: List[AISummarySection]
    full_markdown: str
    scientific_disclaimer: str

class AIChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class AIChatRequest(BaseModel):
    message: str = Field(..., description="User query directed to the nowcasting assistant")
    event_id: Optional[str] = Field(None, description="Active event ID")
    timestamp: Optional[str] = Field(None, description="Active frame timestamp")
    selected_horizon: Optional[str] = Field("NOW", description="Active horizon")
    selected_model: Optional[str] = Field("CONVGRU", description="Active forecast model")
    dashboard_context: Optional[Dict[str, Any]] = Field(None, description="Full real-time telemetry from frontend dashboard")
    conversation_history: Optional[List[AIChatMessage]] = Field(default_factory=list)

class AIChatResponse(BaseModel):
    status: str = "success"
    reply: str
    timestamp: str
    selected_horizon: str
    provider: str
    model_name: str
    suggested_questions: List[str]
    scientific_disclaimer: str
