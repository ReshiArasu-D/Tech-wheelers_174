"""
Integration Interfaces for SIH 26084 Convective Scale Nowcasting.
Defines clean contracts for all 11 scientific pipeline stages:
1. Radar Encoder           (DWR reflectivity + radial velocity -> radar latent representation)
2. Atmosphere Encoder      (INSAT IR + IMERG + ERA5 -> atmospheric latent representation)
3. Fusion                  (Radar rep + Atmosphere rep -> fused storm representation)
4. Storm Evolution         (Optical flow + detection + tracking -> convective growth/decay state)
5. Short-Horizon Forecast  (+15, +30, +60 min fine-scale cell polygons and vectors)
6. Long-Horizon Forecast   (+180, +360 min probabilistic dispersion corridors)
7. Hazard Heads            (6 heads: Lightning, Thunderstorm, Hail, Heavy Rain, Cloudburst, Downburst)
8. Uncertainty Engine      (Temperature scaling, conformal intervals, sensor penalty)
9. Risk Engine             (Hazard severity + probability + uncertainty + static exposure -> score 0-100)
10. Arrival Engine         (Leading-edge corridor intersection -> target arrival countdowns)
11. Alert Candidate Manager(Human-in-the-loop candidate review, approval & rejection)
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import numpy as np


@dataclass
class RadarRepresentation:
    """Output contract of the Radar Encoder."""
    feature_map: np.ndarray          # Shape: (C_rad, H, W) or (B, C, H, W)
    reflectivity_dbz: np.ndarray     # Native reflectivity grid
    radial_velocity_ms: Optional[np.ndarray] = None
    quality_flag: str = "NOMINAL"
    is_available: bool = True
    sensor_provenance: str = "IMD DWR S-Band"


@dataclass
class AtmosphereRepresentation:
    """Output contract of the Atmosphere Encoder."""
    feature_map: np.ndarray          # Shape: (C_atm, H, W)
    tir_brightness_temp_k: np.ndarray # Native INSAT-3D TIR1 field
    cooling_rate_k_hr: np.ndarray    # Vertical updraft cooling rate
    era5_cape: float = 0.0
    era5_shear: float = 0.0
    era5_pw: float = 0.0
    is_available: bool = True
    sensor_provenance: str = "INSAT-3D TIR1 + ERA5 Reanalysis"


@dataclass
class FusedStormRepresentation:
    """Output contract of StormFeatureFusion."""
    fused_features: np.ndarray       # Fused latent representation tensor
    convective_mask: np.ndarray      # Binary / probabilistic initiation mask
    fusion_mode: str                 # "FULL_MULTIMODAL" or "REDUCED_ATMOSPHERE_ONLY"
    radar_available: bool = False
    confidence_discount: float = 1.0


@dataclass
class HazardOutput:
    """Uniform output schema for each of the 6 hazard indicators."""
    hazard_type: str                 # lightning, thunderstorm, hail, heavy_rain, cloudburst, downburst
    probability: Optional[float]     # 0.0 to 1.0, or None if UNAVAILABLE
    severity: str                    # NONE, LOW, MODERATE, HIGH, SEVERE, or UNAVAILABLE
    confidence: str                  # LOW, MEDIUM, HIGH, or UNAVAILABLE
    uncertainty: float               # Conformal uncertainty score (0.0 to 1.0)
    horizon_minutes: int             # Forecast horizon lead time (e.g. 15, 30, 60)
    spatial_field: Dict[str, Any]    # Affected area (km2), geometry, contour
    model_status: str                # TRAINED_CHECKPOINT, PROXY_CALIBRATED, UNAVAILABLE
    scientific_basis: str            # Physical meteorological explanation
    provenance: str                  # Sensor inputs used


# =====================================================================
# 1. Radar Encoder Interface
# =====================================================================
class IRadarEncoder(ABC):
    @abstractmethod
    def encode(self, reflectivity: np.ndarray, velocity: Optional[np.ndarray] = None) -> RadarRepresentation:
        """Encodes Doppler radar fields into latent radar representation."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if trained checkpoint and radar data are active."""
        pass


# =====================================================================
# 2. Atmosphere Encoder Interface
# =====================================================================
class IAtmosphereEncoder(ABC):
    @abstractmethod
    def encode(self,
               tir1_frame: np.ndarray,
               prev_tir1_frame: np.ndarray,
               era5_context: Dict[str, Any],
               imerg_rain: Optional[np.ndarray] = None) -> AtmosphereRepresentation:
        """Encodes satellite infrared + ERA5 into latent atmospheric representation."""
        pass


# =====================================================================
# 3. Fusion Interface
# =====================================================================
class IFusion(ABC):
    @abstractmethod
    def fuse(self,
             radar_rep: Optional[RadarRepresentation],
             atm_rep: AtmosphereRepresentation) -> FusedStormRepresentation:
        """Fuses radar and atmospheric representations into unified storm state."""
        pass


# =====================================================================
# 4. Storm Evolution Interface (Optical Flow + Detection + Tracking)
# =====================================================================
class IStormEvolution(ABC):
    @abstractmethod
    def detect_and_track(self,
                         curr_intensity: np.ndarray,
                         prev_intensity: np.ndarray,
                         dense_flow: np.ndarray,
                         timestamp: str) -> List[Dict[str, Any]]:
        """Identifies storm cells, assigns persistent IDs, calculates motion vectors."""
        pass


# =====================================================================
# 5. Short-Horizon Forecast Interface (+15, +30, +60 min)
# =====================================================================
class IShortHorizonForecast(ABC):
    @abstractmethod
    def forecast(self,
                 fused_state: FusedStormRepresentation,
                 tracked_cells: List[Dict[str, Any]],
                 dense_flow: np.ndarray,
                 horizons: List[int] = [15, 30, 60]) -> Dict[str, Dict[str, Any]]:
        """Generates fine storm-scale cell polygons and advection/residual trajectories."""
        pass


# =====================================================================
# 6. Long-Horizon Forecast Interface (+180, +360 min)
# =====================================================================
class ILongHorizonForecast(ABC):
    @abstractmethod
    def forecast_corridors(self,
                           fused_state: FusedStormRepresentation,
                           tracked_cells: List[Dict[str, Any]],
                           dense_flow: np.ndarray,
                           horizons: List[int] = [180, 360]) -> Dict[str, Dict[str, Any]]:
        """Generates broad probabilistic dispersion corridors with expanding uncertainty cones."""
        pass


# =====================================================================
# 7. Hazard Heads Interface (All 6 Hazards)
# =====================================================================
class IHazardHeads(ABC):
    @abstractmethod
    def evaluate_all(self,
                     fused_state: FusedStormRepresentation,
                     tracked_cells: List[Dict[str, Any]],
                     era5_context: Dict[str, Any],
                     sensor_status: Dict[str, str],
                     horizon_min: int = 30) -> Dict[str, HazardOutput]:
        """Evaluates all 6 convective hazards according to unified output schema."""
        pass


# =====================================================================
# 8. Uncertainty Engine Interface
# =====================================================================
class IUncertaintyEngine(ABC):
    @abstractmethod
    def calibrate(self,
                  raw_prob: float,
                  horizon_min: int,
                  sensor_status: Dict[str, str]) -> float:
        """Applies temperature scaling and sensor dropout penalty to probabilities."""
        pass

    @abstractmethod
    def compute_conformal_interval(self,
                                  prob: float,
                                  horizon_min: int,
                                  sensor_status: Dict[str, str]) -> Dict[str, float]:
        """Calculates rigorous upper/lower confidence bounds."""
        pass


# =====================================================================
# 9. Risk Engine Interface
# =====================================================================
class IRiskEngine(ABC):
    @abstractmethod
    def compute_risk(self,
                     hazards: Dict[str, HazardOutput],
                     tracked_cells: List[Dict[str, Any]],
                     arrivals: Dict[str, Any],
                     sensor_status: Dict[str, str]) -> Dict[str, Any]:
        """Combines hazard severities, uncertainty, arrival lead-time, and static exposure."""
        pass


# =====================================================================
# 10. Arrival Engine Interface
# =====================================================================
class IArrivalEngine(ABC):
    @abstractmethod
    def compute_arrivals(self,
                         tracked_cells: List[Dict[str, Any]],
                         forecasts: Dict[str, Any],
                         sensor_status: Dict[str, str]) -> Dict[str, Any]:
        """Calculates leading-edge arrival countdowns to key infrastructure/urban targets."""
        pass


# =====================================================================
# 11. Alert Candidate Manager Interface
# =====================================================================
class IAlertCandidateManager(ABC):
    @abstractmethod
    def generate_candidates(self,
                            timestamp: str,
                            risk: Dict[str, Any],
                            arrivals: Dict[str, Any],
                            hazards: Dict[str, HazardOutput],
                            storms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generates candidates requiring human sign-off."""
        pass

    @abstractmethod
    def approve(self, alert_id: str, operator_name: str, comments: Optional[str] = None) -> Dict[str, Any]:
        """Records operational meteorologist approval."""
        pass

    @abstractmethod
    def reject(self, alert_id: str, operator_name: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Records operational meteorologist rejection."""
        pass
