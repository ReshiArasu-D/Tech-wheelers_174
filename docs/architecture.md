# CO-NOWCAST Architecture Documentation

## Production System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐         │
│  │ DWR      │  │ INSAT    │  │ Lightning │  │ ERA5     │         │
│  │ S/C-Band │  │ 3D/3DR   │  │ LLDN      │  │ ECMWF   │         │
│  │ Radar    │  │ Imager   │  │ Network   │  │ Reanaly  │         │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘         │
│       │              │              │              │               │
│       ▼              ▼              ▼              ▼               │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │              Quality Control & Validation               │      │
│  │  • Range checks  • Clutter removal  • Artifact flags   │      │
│  └─────────────────────────┬───────────────────────────────┘      │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────┐      │
│  │         Temporal Synchronization & Windowing             │      │
│  │  • ±5 min matching  • Gap-aware interpolation           │      │
│  └─────────────────────────┬───────────────────────────────┘      │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────┐      │
│  │        Spatio-temporal Registration & Regridding         │      │
│  │  • Radar-anchored 1–3 km analysis grid (pyproj)        │      │
│  │  • Bilinear interpolation of coarser INSAT/ERA5        │      │
│  └─────────────────────────┬───────────────────────────────┘      │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────┐      │
│  │     Multimodal Fusion + Sensor Availability Mask         │      │
│  │  • Available / Missing / Stale / Quality Flag per modal │      │
│  │  • Graceful degradation when DWR/Lightning unavailable  │      │
│  └─────────────────────────┬───────────────────────────────┘      │
└────────────────────────────┼───────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│                    DETECTION & TRACKING                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │              Convective Initiation (CI)                  │      │
│  │  Prototype: Tb threshold + cooling rate + ERA5 CAPE     │      │
│  │  Production: + Radar echo growth + Lightning onset      │      │
│  └─────────────────────────┬───────────────────────────────┘      │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────┐      │
│  │         Storm Cell Detection & Segmentation              │      │
│  │  1. Binary convective threshold (Tb < 235 K)           │      │
│  │  2. Morphological cleanup (open → close)               │      │
│  │  3. Connected components (OpenCV contours)             │      │
│  │  4. Small region removal (area < 150 km²)              │      │
│  │  5. Polygon extraction + centroid + area               │      │
│  └─────────────────────────┬───────────────────────────────┘      │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────┐      │
│  │           Multi-Frame Storm Tracking                     │      │
│  │  • Centroid Haversine distance + Polygon IoU            │      │
│  │  • Persistent IDs across frames                         │      │
│  │  • MERGE detection (2+ parents → 1 child)              │      │
│  │  • SPLIT detection (1 parent → 2+ children)            │      │
│  │  • GENESIS (new cell initiation)                        │      │
│  └─────────────────────────┬───────────────────────────────┘      │
└────────────────────────────┼───────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│                    FORECASTING ENGINE                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────┐                   │
│  │       Dense Optical Flow (Farneback)       │                   │
│  │  → Storm motion u, v, speed, direction     │                   │
│  │  → Baseline advection forecast field       │                   │
│  └─────────────────────┬──────────────────────┘                   │
│                        │                                           │
│  ┌─────────────────────▼──────────────────────┐                   │
│  │       ConvGRU Residual Neural Model        │                   │
│  │  Input: [prev, curr, u_flow, v_flow, env]  │                   │
│  │  Output: bounded residual [-0.35, +0.35]   │                   │
│  │  Final = clamp(Flow + Residual, 0, 1)      │                   │
│  └─────────────────────┬──────────────────────┘                   │
│                        │                                           │
│  ┌─────────────────────▼──────────────────────┐                   │
│  │     Multi-Horizon Forecast Generation      │                   │
│  │  +15m: Fine storm-scale polygons           │                   │
│  │  +30m: Fine storm-scale polygons           │                   │
│  │  +60m: Fine storm-scale polygons           │                   │
│  │  +180m: Broad probabilistic corridors      │                   │
│  │  +360m: Broad probabilistic corridors      │                   │
│  └─────────────────────┬──────────────────────┘                   │
└────────────────────────┼───────────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────────┐
│               HAZARD + RISK + ALERT LAYER                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐ ┌────────┐ ┌───────────┐ ┌───────────┐             │
│  │Lightning │ │ Hail   │ │ Downburst │ │Cloudburst │             │
│  │  Proxy   │ │ Proxy  │ │   Proxy   │ │  Proxy    │             │
│  └────┬─────┘ └───┬────┘ └─────┬─────┘ └─────┬─────┘             │
│       └────────────┼───────────┼──────────────┘                   │
│                    ▼           ▼                                   │
│  ┌─────────────────────────────────────────────┐                  │
│  │     Uncertainty Calibration Engine          │                  │
│  │  • Temperature scaling (per horizon+sensor) │                  │
│  │  • Conformal prediction intervals           │                  │
│  └─────────────────────┬───────────────────────┘                  │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────┐                  │
│  │           Risk Engine (0–100 Score)         │                  │
│  │  Hazard × Exposure × Urgency × Persistence │                  │
│  └─────────────────────┬───────────────────────┘                  │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────┐                  │
│  │      Hazard Arrival Engine (Countdown)      │                  │
│  │  Leading-edge contour intersection + ETA    │                  │
│  └─────────────────────┬───────────────────────┘                  │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────┐                  │
│  │         Alert Candidate Generation          │                  │
│  │  → NEVER auto-disseminates                  │                  │
│  │  → ALWAYS requires human approval           │                  │
│  └─────────────────────┬───────────────────────┘                  │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────┐                  │
│  │         Human Operator Approval             │                  │
│  │  → Audit log in SQLite                      │                  │
│  │  → Dissemination after sign-off             │                  │
│  └─────────────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────────────┘
```

## Regional Scalability (Production)

```
Regional Tiling (20–30 km overlap)
       ↓
Parallel Stateless Inference (per tile)
       ↓
Storm Handoff Across Tile Boundaries
       ↓
Shared Model Weights (single architecture)
       ↓
Regional Calibration Parameters
```

The model is reusable across regions. Only the calibration parameters
(temperature scaling temperatures, conformal quantiles) are tuned per region.

## Data Fusion (Production)

```
                    ┌── DWR (Reflectivity + Velocity)
                    │
                    ├── INSAT (Brightness Temp + Cooling Rate)
Input Modalities ───┼── Lightning (Flash Density / Rate)
                    │
                    └── ERA5 (CAPE, Shear, PW, Wind)
                          ↓
              Availability Mask (available / missing / stale)
                          ↓
                  Fusion Encoder (channel concatenation)
                          ↓
                    Forecast Head
```
