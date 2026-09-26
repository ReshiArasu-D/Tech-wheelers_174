# CO-NOWCAST

## Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0–6 hr)

> **SIH 2026 — Problem Statement 26084**
> Real-time convective-scale decision-support system with 0–6 hour lead time, multi-source data fusion, early convective initiation detection, multi-hazard assessment, GIS visualization, and human-in-the-loop alert workflows.

---

## 1. Problem Statement

India faces devastating losses from severe convective weather — thunderstorms, hail, microbursts, and cloudbursts — which develop rapidly and are difficult to forecast beyond 1–2 hours with conventional NWP models. IMD and state DMAs need a hyper-local nowcasting system that:

- Detects convective initiation **before** severe weather materializes
- Tracks individual storm cells with persistent identifiers
- Forecasts storm evolution across **5 horizons** (+15m, +30m, +60m, +3h, +6h)
- Assesses **4 distinct hazards** (Lightning, Hail, Downburst, Cloudburst)
- Provides location-specific **arrival countdowns** for critical infrastructure
- Maintains **calibrated uncertainty** that degrades gracefully under sensor dropout
- Supports a **human-in-the-loop** alert approval workflow

---

## 2. Solution Architecture

```
DWR + INSAT + Lightning + ERA5
              ↓
       Real-time Ingestion
              ↓
       Quality Control
              ↓
 Temporal Synchronization / Windowing
              ↓
    Spatio-temporal Registration
              ↓
 Regional Radar-Anchored 1–3 km Grid
              ↓
 Multimodal Fusion + Availability Mask
              ↓
     Convective Initiation
              ↓
 Storm Cell Detection + Tracking
              ↓
         Optical Flow
              ↓
      ConvGRU Residual Model
              ↓
 Multi-Horizon Forecasting
 +15 / +30 / +60 / +180 / +360
              ↓
       Multi-Hazard Heads
              ↓
   Uncertainty Calibration
              ↓
          Risk Engine
              ↓
     Hazard Arrival Engine
              ↓
        GIS Dashboard
              ↓
       Alert Candidate
              ↓
       Human Approval
              ↓
       Dissemination
```

---

## 3. Data Sources

| Source | Status | Resolution | Usage |
|--------|--------|-----------|-------|
| **INSAT-3D/3DR TIR1** | ✅ REAL (Prototype) | 3.7 km native | Brightness Temperature, Convective Detection |
| **ERA5 Reanalysis** | ✅ Available (Context) | 0.25° (~28 km) | CAPE, CIN, PW, Wind Shear |
| **DWR Doppler Radar** | ⬜ Production Only | 1–3 km | Reflectivity, Radial Velocity |
| **Lightning Network** | ⬜ Production Only | Point obs | Flash Density, Rate |

### Historical Event Used
**07-NOV-2019 Bay of Bengal Severe Convective Storm / Cyclone Bulbul**
- 9 sequential INSAT-3D TIR1 frames (03:00–07:00 UTC, 30 min cadence)
- Region: 10°N–24°N, 80°E–94°E (Eastern Coast & Bay of Bengal)
- Source: MOSDAC/ISRO Level-1B Standard via Kaggle (`knowhrishi/insat3d-india`)

---

## 4. Prototype vs Production

| Feature | Prototype | Production |
|---------|-----------|------------|
| Primary Sensor | INSAT-3D TIR1 (3.7 km) | DWR S/C-Band Radar (1 km) |
| Grid Resolution | 3.7 km native satellite | 1–3 km radar-anchored |
| CI Detection | Tb threshold + cooling rate + ERA5 | + Radar echo growth + Lightning onset |
| Hail Detection | Cold-core + CAPE proxy | + Reflectivity core + Echo-top height |
| Downburst Detection | Intensity trend proxy | + Doppler radial velocity divergence |
| Cloudburst | Satellite rainfall-rate proxy | + Rain gauge verification |
| Uncertainty | Temperature scaling + Conformal intervals | + Field-calibrated against observations |

---

## 5. AI Pipeline

### Models
1. **Persistence (Baseline 1)**: Future = Current state unchanged
2. **Optical Flow Advection (Baseline 2)**: OpenCV Farneback dense flow → backward warping
3. **ConvGRU Residual (Primary AI)**: Learned convective growth/decay residuals on top of optical flow advection

### Forecast Horizons
- **+15m / +30m / +60m**: Fine storm-scale cell polygons, vector trajectories, high confidence
- **+180m / +360m**: Broad probabilistic corridors, wider uncertainty, lower confidence

### Uncertainty Quantification
- **Temperature Scaling** for hazard classification calibration
- **Conformal Prediction Intervals** for continuous intensity fields
- Calibrated separately by forecast horizon AND sensor availability state

---

## 6. Multi-Hazard Assessment

| Hazard | Physical Basis (Prototype) | Scientific Label |
|--------|---------------------------|-----------------|
| **Lightning** | Cloud-top glaciation (Tb < 225K) + cooling rate | Lightning proxy — direct observations unavailable |
| **Hail** | Overshooting Tb < 205K + CAPE > 2000 J/kg + shear | Hail proxy — not verified against hail reports |
| **Downburst** | Intensity trend + cloud-top collapse | Downburst proxy — radar velocity required |
| **Cloudburst** | Deep core Tb < 200K + PW > 50mm + slow motion | Cloudburst proxy — not gauge verified (IMD: ≥100mm/hr) |

---

## 7. Risk Engine

Combines: Hazard probability × Severity × Uncertainty × Arrival time × Population exposure × Infrastructure exposure × Persistence → **Risk Score (0–100)**

---

## 8. Arrival Engine

For each critical target location:
1. Check if target is inside current storm polygon
2. Test projected polygons across forecast horizons (+15m → +360m)
3. Evaluate leading-edge trajectory bearing convergence
4. Interpolate ETA with contour intersection
5. Display countdown: `00:42:18`

---

## 9. Dashboard Features

- **Interactive GIS Map** (Leaflet + CartoDB Dark Matter)
- **Storm Cell Polygons** with convective Tb color scale
- **Motion Vectors** (yellow dashed arrows)
- **Forecast Horizon Toggle** (NOW, +15m, +30m, +60m, +3h, +6h)
- **Probabilistic Corridors** at 3–6 hour horizons
- **Historical Storm Replay** with Play/Pause/Scrub controls
- **Sensor Availability Mask** with interactive dropout simulation
- **Model Comparison** (Persistence vs Optical Flow vs ConvGRU)
- **4 Hazard Tabs** with calibrated probabilities and scientific disclaimers
- **Risk Score Gauge** and arrival countdown list
- **Alert Candidate Modal** with human operator sign-off workflow
- **Provenance Badge** (Real Data / Prototype Proxy / Production Design)

---

## 10. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |
| GET | `/sensor-status` | Current sensor availability mask |
| GET | `/model-info` | Model architecture and version |
| GET | `/events` | List historical storm events |
| GET | `/events/{id}` | Event detail with timeline |
| GET | `/storms` | Detected storm cells for current frame |
| GET | `/storms/{id}` | Storm cell detail with lineage |
| GET | `/forecast/{event_id}` | Multi-horizon forecasts |
| GET | `/hazards/{event_id}` | 4 hazard proxy assessments |
| GET | `/risk/{event_id}` | Composite risk score |
| GET | `/arrival/{event_id}` | Location arrival countdowns |
| POST | `/predict/frame` | Execute full pipeline for timestamp |
| GET | `/alerts` | List alert candidates |
| POST | `/alerts/{id}/approve` | Human operator sign-off |

---

## 11. Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel / Local | `http://localhost:3000` |
| Backend | Render / Local | `http://localhost:8000` |
| Database | SQLite | `backend/co_nowcast.db` |
| Training | Google Colab / Kaggle | Free tier |

---

## 12. How to Run Locally

```bash
# 1. Clone repository
git clone https://github.com/ReshiArasu-D/Tech-wheelers_174.git
cd Tech-wheelers_174

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Convert INSAT-3D data to HDF5
python backend/scripts/convert_insat_to_hdf5.py

# 4. Start backend
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

# 5. Install frontend dependencies
cd frontend && npm install

# 6. Start frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 13. Testing

```bash
# Run full test suite (19 tests)
python -m pytest backend/tests/
```

Tests cover:
- HDF5 reader & Tb extraction
- Georeferencing bounds
- Convective initiation scoring
- Storm cell detection & polygon extraction
- Multi-frame tracking & lineage
- Optical flow motion estimation
- ConvGRU residual inference
- Multi-horizon forecasting
- Uncertainty calibration (temperature scaling + conformal intervals)
- 4 hazard proxy assessments
- Risk engine scoring
- Arrival countdown calculation
- All FastAPI HTTP endpoints
- Alert approval workflow

---

## 14. Limitations

1. Prototype operates in **reduced sensor mode** (INSAT + ERA5 only)
2. No DWR Doppler radar data — hail/downburst detection limited to proxies
3. No lightning network — flash density proxied by convective intensity
4. ConvGRU model is a **demonstration/trial model** (limited training data)
5. Uncertainty intervals computed on single historical event — operational field validation pending
6. INSAT native resolution is **3.7 km** — production requires 1 km radar-anchored grid
7. Cloudburst threshold references IMD official definition but is **not gauge-verified**

---

## 15. Future Integration

- [ ] DWR S-Band/C-Band radar reflectivity and Doppler velocity
- [ ] Ground lightning detection network (LLDN) flash density
- [ ] INSAT-3DR sounder profiles for vertical thermodynamic structure
- [ ] Regional tiling with 20–30 km overlap for national coverage
- [ ] Field calibration against IMD observed storm reports
- [ ] CAP/XML alert dissemination protocol integration
- [ ] Mobile push notification for district-level warnings

---

## Team: Tech Wheelers

**SIH 2026 | Problem Statement 26084**

*Built for scientific credibility, operational reasoning, evaluator clarity, and demo reliability.*
