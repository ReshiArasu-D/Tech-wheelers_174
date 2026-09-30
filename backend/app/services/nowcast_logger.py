"""
Structured Inference Logging & Debugging Utility for SIH 26084.
Logs key telemetry for every nowcasting inference execution:
- input timestamp
- input dimensions
- model checkpoint
- forecast horizons
- hazard models evaluated
- output dimensions & cell counts
- processing status & duration
- errors / fallback notices
"""
import logging
import json
import time
from typing import Dict, List, Optional, Any

logger = logging.getLogger("nowcast.inference")
logging.basicConfig(level=logging.INFO)

class NowcastInferenceLogger:
    def __init__(self):
        self._history: List[Dict[str, Any]] = []

    def log_inference_run(self,
                           input_timestamp: str,
                           input_shape: tuple,
                           model_checkpoint: str,
                           horizons: List[int],
                           hazard_models: Dict[str, str],
                           storm_count: int,
                           forecast_shapes: Dict[str, Any],
                           duration_ms: float,
                           processing_status: str = "SUCCESS",
                           errors: Optional[List[str]] = None) -> Dict[str, Any]:
        """Records and logs structured inference record."""
        entry = {
            "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "input_frame_timestamp": input_timestamp,
            "input_dimensions": list(input_shape),
            "model_checkpoint": model_checkpoint,
            "forecast_horizons_min": horizons,
            "hazard_models": hazard_models,
            "storm_cells_detected": storm_count,
            "forecast_output_summary": forecast_shapes,
            "duration_ms": round(duration_ms, 2),
            "processing_status": processing_status,
            "errors": errors or []
        }

        # Store in rolling buffer (max 100)
        self._history.append(entry)
        if len(self._history) > 100:
            self._history.pop(0)

        # Log to logger
        logger.info(
            f"[NOWCAST INFERENCE] Time: {input_timestamp} | Shape: {input_shape} | "
            f"Model: {model_checkpoint} | Storms: {storm_count} | Horizons: {horizons} | "
            f"Status: {processing_status} | Latency: {duration_ms:.1f}ms"
        )
        return entry

    def get_latest_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self._history[-limit:]


nowcast_logger = NowcastInferenceLogger()
