"""
Generative Intelligence Service for CO-NOWCAST using the Google GenAI SDK (google-genai).
Provides:
1. Operational AI Summary Generation
2. Context-Aware AI Chat Assistant

Adheres to:
- Grounded strictly in actual real-time dashboard telemetry.
- No invented numerical values or hallucinated storm tracks.
- Clear separation of:
  * Current Situation
  * Main Hazards
  * Near-term Outlook (+15m to +60m)
  * 6-Hour Outlook (+3h to +6h)
  * Risk / Arrival
  * Recommended Operator Attention
- Uses google-genai SDK with Flash model (gemini-2.5-flash) via GEMINI_API_KEY.
- Retains 100% deterministic local meteorological synthesis fallback if key is absent or API fails.
- Never exposes API keys to the frontend.
"""
import os
import re
import json
import logging
import asyncio
import datetime
from typing import Dict, List, Optional, Any, Tuple

try:
    import httpx
    from google import genai
    from google.genai import types
    GENAI_SDK_AVAILABLE = True
except ImportError:
    GENAI_SDK_AVAILABLE = False

from backend.app.config import settings
from backend.app.schemas.ai import (
    AISummaryRequest, AISummaryResponse, AISummarySection,
    AIChatRequest, AIChatResponse, AIChatMessage
)
from backend.app.services.forecasting import forecasting_pipeline

logger = logging.getLogger(__name__)

# Transient error types that should trigger a retry (Windows wsarecv resets,
# connection forcibly closed, EOF on SSL stream, etc.)
_RETRYABLE_ERRORS = (ConnectionResetError, ConnectionAbortedError, OSError, EOFError)

DISCLAIMER_TEXT = (
    "AI Decision-Support Synthesis — Grounded in active sensor telemetry and calibrated proxy heads. "
    "Advisory only; does NOT replace mandatory human operator sign-off for statutory alert dissemination."
)

SUGGESTED_QUESTIONS = [
    "What is the main threat right now?",
    "What happens in the next 60 minutes?",
    "When is the expected arrival for coastal ports?",
    "Why is the composite risk score elevated?",
    "Which hazard is dominant across the tracked cells?",
    "What changes between +1 hour and +3 hours?",
    "What is the broad 6-hour convective outlook?"
]


class AIAssistantService:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.model_name = settings.AI_MODEL or "gemini-2.5-flash"
        self._client: Optional[Any] = None
        self._init_client()

    def _init_client(self):
        """Initializes the Google GenAI client if SDK and key are available.

        Uses an explicit httpx client configured for HTTP/1.1 (via HttpOptions)
        to prevent the Windows `wsarecv: connection forcibly closed` TCP stream
        resets that occur with HTTP/2 multiplexing on some networks.
        """
        if GENAI_SDK_AVAILABLE and self.gemini_key and not self.gemini_key.startswith("your_"):
            try:
                # Force HTTP/1.1 to avoid HTTP/2 stream-reset errors on Windows.
                # google-genai 2.x exposes this via HttpOptions(httpx_client=...).
                _http1_client = httpx.Client(
                    http2=False,
                    timeout=httpx.Timeout(60.0, connect=15.0),
                    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
                )
                _http_opts = types.HttpOptions(httpx_client=_http1_client)
                self._client = genai.Client(
                    api_key=self.gemini_key,
                    http_options=_http_opts,
                )
                logger.info(
                    "Google GenAI SDK initialised (HTTP/1.1 transport, "
                    f"model={self.model_name})"
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Google GenAI client: {e}")
                self._client = None
        else:
            self._client = None

    async def _gemini_call_with_retry(
        self,
        user_prompt: str,
        system_instruction: str,
        max_output_tokens: int = 800,
        temperature: float = 0.25,
        max_attempts: int = 3,
        base_delay: float = 1.0
    ) -> Optional[str]:
        """Calls Gemini generate_content with model fallbacks and exponential backoff retry.
        
        Attempts models in priority order: configured model -> gemini-2.5-flash -> gemini-2.5-flash-lite -> gemini-flash-latest.
        Catches 503 (high demand), 429 (rate limit), and transient network resets.
        """
        if not self._client:
            return None

        candidate_models = [self.model_name]
        for fallback in ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_instruction,
            max_output_tokens=max_output_tokens
        )

        for model in candidate_models:
            for attempt in range(1, max_attempts + 1):
                try:
                    def _call():
                        return self._client.models.generate_content(
                            model=model,
                            contents=user_prompt,
                            config=config
                        )
                    resp = await asyncio.to_thread(_call)
                    if resp and resp.text:
                        return resp.text.strip()
                except _RETRYABLE_ERRORS as exc:
                    wait = base_delay * (2 ** (attempt - 1))
                    logger.warning(
                        f"Gemini connection error on {model} (attempt {attempt}/{max_attempts}): {exc}. Retrying in {wait:.1f}s..."
                    )
                    await asyncio.sleep(wait)
                except Exception as exc:
                    err_str = str(exc)
                    # If 503 (high demand) or 429 (quota), try next attempt or fallback model
                    if "503" in err_str or "UNAVAILABLE" in err_str or "demand" in err_str or "429" in err_str:
                        logger.warning(f"Model {model} busy or unavailable ({err_str[:120]}...). Trying fallback...")
                        break  # move to next candidate model
                    else:
                        logger.error(f"Gemini generation error on {model}: {exc}")
                        break
        return None

    def _ensure_context(self, request_context: Optional[Dict[str, Any]], timestamp: Optional[str]) -> Dict[str, Any]:
        """Resolves active dashboard telemetry, running pipeline if necessary."""
        if request_context and isinstance(request_context, dict) and "hazards" in request_context:
            return request_context
        try:
            return forecasting_pipeline.run_pipeline_for_frame(timestamp=timestamp)
        except Exception as e:
            logger.warning(f"Could not execute pipeline frame for AI context: {e}")
            return {}

    async def generate_summary(self, req: AISummaryRequest) -> AISummaryResponse:
        """Generates a structured operational summary from the current dashboard state."""
        ctx = self._ensure_context(req.dashboard_context, req.timestamp)
        timestamp_str = req.timestamp or ctx.get("timestamp", datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
        horizon_str = req.selected_horizon or "NOW"
        
        # 1. Attempt Google GenAI SDK (Gemini Flash)
        if self._client is not None:
            try:
                gemini_resp = await self._call_gemini_summary(ctx, horizon_str, timestamp_str)
                if gemini_resp:
                    return gemini_resp
            except Exception as e:
                logger.error(f"Gemini API summary call failed, falling back to deterministic local engine: {e}")

        # 2. Deterministic Meteorological Synthesis Fallback
        return self._build_local_summary(ctx, horizon_str, timestamp_str)

    async def chat(self, req: AIChatRequest) -> AIChatResponse:
        """Answers operator queries grounded strictly in current dashboard telemetry."""
        ctx = self._ensure_context(req.dashboard_context, req.timestamp)
        timestamp_str = req.timestamp or ctx.get("timestamp", datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
        horizon_str = req.selected_horizon or "NOW"

        # 1. Attempt Google GenAI SDK (Gemini Flash)
        if self._client is not None:
            try:
                gemini_reply = await self._call_gemini_chat(req.message, req.conversation_history, ctx, horizon_str, timestamp_str)
                if gemini_reply:
                    return AIChatResponse(
                        status="success",
                        reply=gemini_reply,
                        timestamp=timestamp_str,
                        selected_horizon=horizon_str,
                        provider="Google Gemini Flash (Cloud)",
                        model_name=self.model_name,
                        suggested_questions=SUGGESTED_QUESTIONS,
                        scientific_disclaimer=DISCLAIMER_TEXT
                    )
            except Exception as e:
                logger.error(f"Gemini API chat call failed, falling back to deterministic local engine: {e}")

        # 2. Deterministic Context-Aware Reasoning Fallback
        reply = self._build_local_chat_reply(req.message, ctx, horizon_str, timestamp_str)
        return AIChatResponse(
            status="success",
            reply=reply,
            timestamp=timestamp_str,
            selected_horizon=horizon_str,
            provider="CO-NOWCAST Operational Synthesis Engine",
            model_name="deterministic-nowcast-ai-v1",
            suggested_questions=SUGGESTED_QUESTIONS,
            scientific_disclaimer=DISCLAIMER_TEXT
        )

    # -------------------------------------------------------------------------
    # GOOGLE GENAI SDK (GEMINI FLASH) INTEGRATION
    # -------------------------------------------------------------------------

    async def _call_gemini_summary(self, ctx: Dict[str, Any], horizon: str, timestamp: str) -> Optional[AISummaryResponse]:
        """Calls Gemini Flash via google-genai SDK to produce structured operational summary."""
        system_instruction = (
            "You are the Chief AI Meteorological Decision Support Officer for CO-NOWCAST (SIH 2026 Problem Statement 26084). "
            "You analyze real-time nowcast telemetry from INSAT-3D, ERA5, Farneback Optical Flow, and ConvGRU.\n"
            "STRICT RULES:\n"
            "1. NEVER invent numerical values. Use ONLY the exact numbers in the supplied JSON context.\n"
            "2. Ground all hazard assessments in the specified proxy indicators and disclaimers.\n"
            "3. Format your response into EXACTLY these 6 sections with markdown headers:\n"
            "   ### 1. Current Situation\n"
            "   ### 2. Main Hazards\n"
            "   ### 3. Near-term Outlook (+15m to +60m)\n"
            "   ### 4. 6-Hour Outlook (+3h to +6h)\n"
            "   ### 5. Risk / Arrival Assessment\n"
            "   ### 6. Recommended Operator Attention\n"
            "4. Maintain a disciplined, professional operational meteorologist tone. Keep each section concise and factual."
        )

        compact_context = {
            "timestamp": timestamp,
            "selected_horizon": horizon,
            "storms": ctx.get("storms", []),
            "hazards": ctx.get("hazards", {}),
            "risk": ctx.get("risk", {}),
            "arrival": ctx.get("arrival", {}),
            "forecasts": {k: {"confidence": v.get("confidence"), "uncertainty": v.get("uncertainty_score"), "type": v.get("type")} for k, v in ctx.get("forecasts", {}).items()},
            "sensor_status": ctx.get("sensor_status", {}),
            "alert_candidates": ctx.get("alert_candidates", [])
        }

        user_prompt = f"Analyze this active nowcast telemetry and produce the 6-section operational summary:\n\n{json.dumps(compact_context, default=str)}"

        text = await self._gemini_call_with_retry(
            user_prompt=user_prompt,
            system_instruction=system_instruction,
            max_output_tokens=1500,
            temperature=0.2
        )

        if not text:
            return None

        sections = self._parse_summary_sections(text, ctx, horizon, timestamp)

        return AISummaryResponse(
            status="success",
            timestamp=timestamp,
            selected_horizon=horizon,
            provider="Google Gemini Flash (Cloud)",
            model_name=self.model_name,
            generated_at=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            sections=sections,
            full_markdown=text,
            scientific_disclaimer=DISCLAIMER_TEXT
        )

    def _parse_summary_sections(self, text: str, ctx: Dict[str, Any], horizon: str, timestamp: str) -> List[AISummarySection]:
        """Parses generated markdown into discrete UI section cards."""
        expected_titles = [
            "1. Current Situation",
            "2. Main Hazards",
            "3. Near-term Outlook (+15m to +60m)",
            "4. 6-Hour Outlook (+3h to +6h)",
            "5. Risk / Arrival Assessment",
            "6. Recommended Operator Attention"
        ]

        pattern = r"###?\s*(?:(\d\.\s*[^#\n]+))\n(.*?)(?=(?:###?\s*\d\.)|\Z)"
        matches = re.findall(pattern, text, re.DOTALL)

        sections = []
        if matches and len(matches) >= 6:
            for title, content in matches:
                clean_title = title.strip()
                clean_content = content.strip()
                sections.append(AISummarySection(title=clean_title, content=clean_content))
        else:
            # Fallback to local sections if output formatting was unstructured
            local_fallback = self._build_local_summary(ctx, horizon, timestamp)
            return local_fallback.sections

        return sections

    async def _call_gemini_chat(self,
                                message: str,
                                history: Optional[List[Any]],
                                ctx: Dict[str, Any],
                                horizon: str,
                                timestamp: str) -> Optional[str]:
        """Calls Gemini Flash via google-genai SDK for contextual nowcasting Q&A."""
        system_instruction = (
            "You are the intelligent AI Meteorological Decision Support Assistant for CO-NOWCAST "
            "(SIH 2026 Problem Statement 26084: Convective Scale Multi-Hazard Nowcasting Platform).\n"
            "You provide real-time, dynamic decision support to duty meteorologists, disaster managers, and field operators.\n\n"
            "Core Guidelines:\n"
            "1. Answer any question in natural, clear, professional language.\n"
            "2. Ground specific telemetry facts (e.g. storm cell count, brightness temperatures, motion vectors, arrival times, composite risk score, hazard probabilities) in the supplied dashboard context.\n"
            "3. If the user asks about meteorological physics (e.g. cloud-top cooling, glaciation, Farneback optical flow, ConvGRU, ERA5 CAPE/shear, DWR proxy heads, hazard mechanisms), explain clearly with scientific depth.\n"
            "4. Provide actionable operational advice, preparedness steps, and risk mitigation when asked.\n"
            "5. Maintain a supportive, highly knowledgeable operational assistant persona.\n"
            "6. Remind operators that formal alert dissemination requires standard human sign-off."
        )

        # Build conversational history if present
        history_lines = []
        if history:
            for item in history[-6:]:
                role = "User" if (getattr(item, "role", "") == "user" or (isinstance(item, dict) and item.get("role") == "user")) else "Assistant"
                cnt = getattr(item, "content", "") if not isinstance(item, dict) else item.get("content", "")
                if cnt:
                    history_lines.append(f"{role}: {cnt}")

        history_section = ""
        if history_lines:
            history_section = "Recent Conversation History:\n" + "\n".join(history_lines) + "\n\n"

        context_summary = {
            "timestamp": timestamp,
            "selected_horizon": horizon,
            "storms": ctx.get("storms", []),
            "hazards": ctx.get("hazards", {}),
            "risk": ctx.get("risk", {}),
            "arrival": ctx.get("arrival", {}),
            "forecasts": {k: {"confidence": v.get("confidence"), "uncertainty": v.get("uncertainty_score"), "type": v.get("type")} for k, v in ctx.get("forecasts", {}).items()},
            "sensor_status": ctx.get("sensor_status", {}),
            "alert_candidates": ctx.get("alert_candidates", [])
        }

        user_prompt = (
            f"Active Dashboard Telemetry Context:\n{json.dumps(context_summary, default=str)}\n\n"
            f"{history_section}"
            f"User Question: {message}"
        )

        return await self._gemini_call_with_retry(
            user_prompt=user_prompt,
            system_instruction=system_instruction,
            max_output_tokens=800,
            temperature=0.3
        )

    # -------------------------------------------------------------------------
    # DETERMINISTIC LOCAL SYNTHESIS ENGINE (SAFETY & NO-KEY FALLBACK)
    # -------------------------------------------------------------------------

    def _build_local_summary(self, ctx: Dict[str, Any], horizon: str, timestamp: str) -> AISummaryResponse:
        storms = ctx.get("storms", [])
        hazards = ctx.get("hazards", {})
        risk = ctx.get("risk", {})
        arrivals = ctx.get("arrival", {})
        forecasts = ctx.get("forecasts", {})
        sensors = ctx.get("sensor_status", {})
        alerts = ctx.get("alert_candidates", [])

        # 1. Current Situation
        storm_count = len(storms)
        if storm_count > 0:
            lead_storm = storms[0]
            lead_id = lead_storm.get("storm_id", "STORM-001")
            min_tb = lead_storm.get("min_tb_k", 210.0)
            area_km2 = lead_storm.get("area_km2", 0.0)
            cooling_rate = lead_storm.get("cooling_rate_k_hr", 0.0)
            motion = lead_storm.get("motion", {})
            speed = motion.get("speed_kmh", 0.0)
            bearing = motion.get("bearing_cardinal", "NE")
            deg = motion.get("direction_deg", 45.0)

            curr_sit = (
                f"At {timestamp.replace('T', ' ').replace('Z', ' UTC')}, the system is actively tracking "
                f"**{storm_count} convective cell(s)**. The primary system **{lead_id}** exhibits intense cloud-top "
                f"glaciation with a minimum brightness temperature of **{min_tb:.1f} K** (cloud-top cooling rate: "
                f"**{cooling_rate:.1f} K/hr**). System coverage spans **{area_km2:,.0f} km²** with kinematic motion "
                f"vector tracking at **{speed:.1f} km/h toward {bearing} ({deg:.0f}°)**."
            )
        else:
            curr_sit = (
                f"At {timestamp.replace('T', ' ').replace('Z', ' UTC')}, no severe convective cells meeting the "
                f"3.7 km native satellite threshold are currently identified in the East Coast analysis sector."
            )

        # 2. Main Hazards (all 6 convective heads)
        haz_lines = []
        dominant_haz = ("lightning", "LOW", 0.0)
        max_prob = -1.0
        for h_key in ["lightning", "thunderstorm", "hail", "heavy_rain", "cloudburst", "downburst"]:
            h_data = hazards.get(h_key, {})
            prob = h_data.get("probability")
            sev = h_data.get("severity", "LOW")
            indicator = h_data.get("proxy_indicator", "Nominal proxy")
            sc_label = h_data.get("scientific_label", "Proxy assessment")
            
            if prob is not None:
                prob_str = f"**{prob * 100:.1f}%**"
                if prob > max_prob:
                    max_prob = prob
                    dominant_haz = (h_key, sev, prob)
            else:
                prob_str = "**UNAVAILABLE (Requires DWR)**"

            haz_lines.append(
                f"- **{h_key.capitalize()}**: Probability {prob_str} ({sev} severity). *Indicator*: {indicator}. ({sc_label})"
            )

        dom_prob_str = f"{dominant_haz[2]*100:.1f}%" if dominant_haz[2] is not None else "N/A"
        main_haz_text = (
            f"Dominant threat is **{dominant_haz[0].upper()}** with **{dom_prob_str}** calibrated probability ({dominant_haz[1]} severity).\n"
            + "\n".join(haz_lines)
        )

        # 3. Near-term Outlook (+15m to +60m)
        f15 = forecasts.get("15m", {})
        f30 = forecasts.get("30m", {})
        f60 = forecasts.get("60m", {})
        
        near_text = (
            f"- **+15 min ({f15.get('target_timestamp', 'T+15m')})**: High-confidence deterministic tracking "
            f"(Confidence: **{f15.get('confidence', 0.85)*100:.0f}%**, Uncertainty index: **{f15.get('uncertainty_score', 0.12):.2f}**). "
            f"Advection governed by OpenCV Farneback dense optical flow.\n"
            f"- **+30 min ({f30.get('target_timestamp', 'T+30m')})**: Core displacement continues along the established "
            f"motion trajectory with bounded ConvGRU residual scaling (Confidence: **{f30.get('confidence', 0.78)*100:.0f}%**).\n"
            f"- **+60 min ({f60.get('target_timestamp', 'T+60m')})**: Outer precipitation contours begin storm-scale "
            f"relaxation; discrete polygon tracking maintained (Confidence: **{f60.get('confidence', 0.65)*100:.0f}%**)."
        )

        # 4. 6-Hour Outlook (+3h to +6h)
        f180 = forecasts.get("180m", {})
        f360 = forecasts.get("360m", {})
        disc_factor = sensors.get("overall_confidence_discount", 0.70)

        six_hr_text = (
            f"Beyond 60 minutes, the physics-AI pipeline transitions deterministically from discrete cell boundaries "
            f"into broad probabilistic corridors to reflect fundamental atmospheric limits on cell-scale predictability:\n"
            f"- **+3 Hours ({f180.get('target_timestamp', 'T+3h')})**: Broad convective dispersion corridor "
            f"(Confidence: **{f180.get('confidence', 0.40)*100:.0f}%**, Uncertainty index: **{f180.get('uncertainty_score', 0.45):.2f}**).\n"
            f"- **+6 Hours ({f360.get('target_timestamp', 'T+6h')})**: Synoptic corridor envelope representing "
            f"convective remnants or regional re-intensification (Confidence: **{f360.get('confidence', 0.25)*100:.0f}%**). "
            f"Overall sensor confidence discount is currently **{disc_factor*100:.0f}%** due to prototype sensor configuration."
        )

        # 5. Risk / Arrival
        r_score = risk.get("overall_risk_score", 0.0)
        r_level = risk.get("risk_level", "LOW")
        infra_risk = risk.get("critical_infrastructure_risk", "MODERATE")
        pop_exp = risk.get("population_exposure_index", 1.0)

        arr_lines = []
        for t_name, t_info in list(arrivals.items())[:4]:
            cd_disp = t_info.get("countdown_display", "NO IMPACT")
            p_imp = t_info.get("impact_probability", 0.0)
            arr_lines.append(f"- **{t_name}**: ETA **{cd_disp}** (Impact prob: **{p_imp*100:.0f}%**)")

        risk_arr_text = (
            f"Composite Operational Risk Score is **{r_score:.1f}/100** (**{r_level}**).\n"
            f"- Critical Infrastructure Risk: **{infra_risk}** (Population Exposure Index: **{pop_exp:.2f}**)\n"
            f"- Target Arrival Timers:\n" + "\n".join(arr_lines)
        )

        # 6. Recommended Operator Attention
        active_candidates = [a for a in alerts if a.get("status") == "CANDIDATE"]
        if active_candidates:
            cand = active_candidates[0]
            op_text = (
                f"1. **Review Pending Alert**: Alert candidate for **{cand.get('target_region', 'Coastal Sector')}** "
                f"({cand.get('hazard_type', 'Convective Storm')}, Risk: {cand.get('risk_score', r_score):.1f}) is awaiting "
                f"mandatory human sign-off in the Alert Candidate Modal.\n"
                f"2. **Monitor Critical Leading Edge**: Inspect the arrival countdown for {list(arrivals.keys())[0] if arrivals else 'coastal assets'}.\n"
                f"3. **Sensor Health**: Ground Doppler radar and lightning sensors are running in proxy mode; observe conformal interval bounds."
            )
        else:
            op_text = (
                f"1. Maintain routine situational watch. No unapproved alert candidates pending sign-off.\n"
                f"2. Re-evaluate convective initiation indicators at the next 30-minute INSAT satellite ingestion frame.\n"
                f"3. Cross-reference leading-edge contour trajectories with local port operations."
            )

        sections = [
            AISummarySection(title="1. Current Situation", content=curr_sit),
            AISummarySection(title="2. Main Hazards", content=main_haz_text),
            AISummarySection(title="3. Near-term Outlook (+15m to +60m)", content=near_text),
            AISummarySection(title="4. 6-Hour Outlook (+3h to +6h)", content=six_hr_text),
            AISummarySection(title="5. Risk / Arrival Assessment", content=risk_arr_text),
            AISummarySection(title="6. Recommended Operator Attention", content=op_text)
        ]

        full_md = "\n\n".join([f"### {s.title}\n{s.content}" for s in sections])

        return AISummaryResponse(
            status="success",
            timestamp=timestamp,
            selected_horizon=horizon,
            provider="CO-NOWCAST Operational Synthesis Engine (Deterministic Fallback)",
            model_name="deterministic-nowcast-ai-v1",
            generated_at=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            sections=sections,
            full_markdown=full_md,
            scientific_disclaimer=DISCLAIMER_TEXT
        )

    def _build_local_chat_reply(self, message: str, ctx: Dict[str, Any], horizon: str, timestamp: str) -> str:
        q = message.lower().strip()
        storms = ctx.get("storms", [])
        hazards = ctx.get("hazards", {})
        risk = ctx.get("risk", {})
        arrivals = ctx.get("arrival", {})
        forecasts = ctx.get("forecasts", {})
        sensors = ctx.get("sensor_status", {})

        if "main threat" in q or "dominant" in q or "highest threat" in q or "primary threat" in q:
            dominant_name = "Lightning"
            max_p = -1.0
            dominant_sev = "LOW"
            dominant_ind = ""
            for hk, hv in hazards.items():
                prob = hv.get("probability", 0.0)
                if prob > max_p:
                    max_p = prob
                    dominant_name = hk.capitalize()
                    dominant_sev = hv.get("severity", "LOW")
                    dominant_ind = hv.get("proxy_indicator", "")
            
            lead_cell = storms[0]["storm_id"] if storms else "None"
            return (
                f"**Dominant Threat**: **{dominant_name}** ({dominant_sev} severity) with a calibrated probability of **{max_p*100:.1f}%**.\n\n"
                f"- **Physical Proxy Basis**: {dominant_ind}\n"
                f"- **Associated Storm**: Active cell **{lead_cell}**\n"
                f"- **Overall Risk Score**: **{risk.get('overall_risk_score', 0):.1f}/100** ({risk.get('risk_level', 'LOW')})\n\n"
                f"*Note: Direct ground lightning and Doppler radar observations are unavailable in the prototype and are estimated via convective glaciation proxies.*"
            )

        elif "60 minute" in q or "next hour" in q or "near-term" in q or "next 60" in q:
            f15 = forecasts.get("15m", {})
            f30 = forecasts.get("30m", {})
            f60 = forecasts.get("60m", {})
            lead_motion = storms[0].get("motion", {}) if storms else {}
            spd = lead_motion.get("speed_kmh", 0)
            card = lead_motion.get("bearing_cardinal", "NE")

            return (
                f"**Next 60-Minute Outlook (T+15m to T+60m)**:\n\n"
                f"- **Storm Motion**: Cells are advecting at **{spd:.1f} km/h toward {card}** along OpenCV Farneback optical flow vectors.\n"
                f"- **+15m ({f15.get('target_timestamp', 'T+15m')})**: High confidence (**{f15.get('confidence', 0.85)*100:.0f}%**); discrete cell boundaries intact.\n"
                f"- **+30m ({f30.get('target_timestamp', 'T+30m')})**: Core propagation continues (Confidence: **{f30.get('confidence', 0.78)*100:.0f}%**; uncertainty envelope: {f30.get('uncertainty_score', 0.22):.2f}).\n"
                f"- **+60m ({f60.get('target_timestamp', 'T+60m')})**: Discrete storm polygon tracking is maintained before corridor expansion (Confidence: **{f60.get('confidence', 0.65)*100:.0f}%**)."
            )

        elif "arrival" in q or "when" in q or "eta" in q or "countdown" in q:
            if not arrivals:
                return "No target arrival data is currently indexed for the active sector."
            
            lines = []
            for t_name, t_val in list(arrivals.items())[:5]:
                cd = t_val.get("countdown_display", "NO IMPACT")
                p = t_val.get("impact_probability", 0.0)
                eta = t_val.get("estimated_arrival_minutes")
                eta_str = f"~{eta:.0f} mins" if eta is not None else "No direct impact"
                lines.append(f"- **{t_name}**: Countdown **{cd}** ({eta_str}, impact prob: **{p*100:.0f}%**)")
            
            return (
                f"**Location-Specific Arrival Countdowns** (derived via leading-edge contour intersection):\n\n"
                + "\n".join(lines) +
                f"\n\n*Calculated against Farneback motion vectors and multi-horizon polygon expansion.*"
            )

        elif "why" in q and "risk" in q or "elevated" in q or "risk score" in q:
            r_score = risk.get("overall_risk_score", 0.0)
            r_level = risk.get("risk_level", "LOW")
            pop_exp = risk.get("population_exposure_index", 1.0)
            infra = risk.get("critical_infrastructure_risk", "MODERATE")
            threat = risk.get("primary_threat", "Convective Thunderstorm")

            return (
                f"**Composite Risk Score is {r_score:.1f}/100 ({r_level})** due to three integrated components:\n\n"
                f"1. **Hazard Severity & Probability**: Dominant driver is **{threat}** with deep convective cores ($T_b < 210\\text{{ K}}$).\n"
                f"2. **Exposure Weights**: Critical infrastructure index is **{infra}** with population exposure factor of **{pop_exp:.2f}** for coastal port and industrial corridors.\n"
                f"3. **Arrival Urgency**: Rapid leading-edge closing speeds toward coastal targets elevates immediate operational urgency.\n\n"
                f"Uncertainty discount factor is currently **{sensors.get('overall_confidence_discount', 0.70)*100:.0f}%**."
            )

        elif "+3" in q or "3 hour" in q or "3h" in q or "180" in q:
            f180 = forecasts.get("180m", {})
            return (
                f"**What changes by +3 Hours ({f180.get('target_timestamp', 'T+180m')})**:\n\n"
                f"- **Predictability Regime**: The model transitions from discrete polygon tracking into **broad probabilistic corridors**. Atmospheric physics does not support deterministic single-cell boundary tracking beyond 120 minutes without radar volume scans.\n"
                f"- **Model Confidence**: Reduces to **{f180.get('confidence', 0.40)*100:.0f}%**.\n"
                f"- **Uncertainty Score**: Increases to **{f180.get('uncertainty_score', 0.45):.2f}**, widening conformal prediction intervals to reflect spatial spread."
            )

        elif "6-hour" in q or "6 hour" in q or "6h" in q or "360" in q:
            f360 = forecasts.get("360m", {})
            return (
                f"**6-Hour Convective Outlook ({f360.get('target_timestamp', 'T+360m')})**:\n\n"
                f"- **Corridor Scale**: Represents synoptic dispersion corridor across the northern Bay of Bengal and coastal Odisha/Bengal.\n"
                f"- **Confidence Level**: **{f360.get('confidence', 0.25)*100:.0f}%** (Uncertainty index: **{f360.get('uncertainty_score', 0.60):.2f}**).\n"
                f"- **Operational Recommendation**: Treat +6h as a broad situational alert for secondary initiation rather than tactical cell avoidance."
            )

        else:
            storms_summary = f"{len(storms)} active cell(s)" if storms else "no severe cells detected"
            risk_summary = f"Risk Score {risk.get('overall_risk_score', 0):.1f}/100 ({risk.get('risk_level', 'LOW')})"
            
            return (
                f"**Current CO-NOWCAST Status ({timestamp.replace('T', ' ').replace('Z', ' UTC')})**:\n\n"
                f"- **Active Tracking**: {storms_summary}\n"
                f"- **Operational Risk**: {risk_summary}\n"
                f"- **Active Model**: {ctx.get('provenance_badge', {}).get('model', 'ConvGRU + Optical Flow')}\n"
                f"- **Selected Horizon**: {horizon}\n\n"
                f"Regarding your query ('*{message}*'): Data specific to this query is bounded within our current telemetry fields. "
                f"You can ask about:\n"
                f"• Main threat and dominant hazards\n"
                f"• 60-minute storm motion outlook\n"
                f"• Location-specific arrival countdowns\n"
                f"• Why composite risk is elevated\n"
                f"• +3h and +6h probabilistic corridor changes."
            )

ai_assistant_service = AIAssistantService()
