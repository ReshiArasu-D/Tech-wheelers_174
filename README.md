# CO-NOWCAST: 0–6 Hour Convective-Scale Nowcasting Decision Support System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-00c7b7?style=for-the-badge&logo=render)](https://now-casr.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.4+-EE4C2C?style=for-the-badge&logo=pytorch)](https://pytorch.org)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![MapLibre GL](https://img.shields.io/badge/MapLibre-3D%20GIS-396afc?style=for-the-badge)](https://maplibre.org)
[![Tests Passing](https://img.shields.io/badge/Tests-39%2F39%20Passing%20(100%25)-brightgreen?style=for-the-badge)](https://github.com/ReshiArasu-D/Tech-wheelers_174)

> **Smart India Hackathon (SIH 2026) — Problem Statement 26084**  
> *Convective Scale Nowcasting for Thunderstorms, Hail, and Cloudbursts (0–6 Hours Lead Time)*  
> **Team: Tech Wheelers**

---

## 🌐 Live Production Deployment

- **Unified Web Application (Frontend + Backend)**: [**https://now-casr.onrender.com**](https://now-casr.onrender.com)
- **Interactive Swagger API Documentation**: [**https://now-casr.onrender.com/docs**](https://now-casr.onrender.com/docs)
- **System Health & Sensor Status Endpoint**: [**https://now-casr.onrender.com/health**](https://now-casr.onrender.com/health)

---

## 📌 Executive Overview

Severe convective storms (severe thunderstorms, large hail, localized cloudbursts, and microbursts/downbursts) develop within 15–45 minutes and cause catastrophic loss of life, aviation hazards, and urban flash floods across India. Traditional Numerical Weather Prediction (NWP) models (e.g., WRF, GFS) are too computationally intensive to update faster than 3–6 hours and struggle to pinpoint convective initiation at kilometer-scale resolution.

**CO-NOWCAST** solves this challenge by fusing real geostationary satellite infrared imagery (**ISRO MOSDAC INSAT-3DR**), ground Doppler Weather Radar (**ISRO TERLS C-Band DWR**), atmospheric reanalysis (**ECMWF ERA5**), and numerical convective proxies into an end-to-end, sub-kilometer deep learning nowcasting engine.

The platform forecasts convective evolution across 5 operational lead times (**NOW, +15m, +30m, +60m, +180m, +360m**), evaluates **6 discrete hazards**, calculates location-specific arrival countdowns, renders an interactive **3D GPU-accelerated GIS dashboard**, and provides a **Human-in-the-Loop (HITL)** alert approval workflow for disaster managers and duty meteorologists.

---

## 🏗️ System Architecture

```
  ┌────────────────┐    ┌─────────────────┐    ┌────────────────┐    ┌────────────────┐
  │  INSAT-3DR     │    │  TERLS C-Band   │    │  ECMWF ERA5    │    │ IMERG / In-situ│
  │  TIR-1 (HDF5)  │    │  DWR Radar Data │    │  U/V Winds     │    │ Convective Obs │
  └───────┬────────┘    └────────┬────────┘    └───────┬────────┘    └───────┬────────┘
          │                      │                     │                     │
          ▼                      ▼                     ▼                     ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │                   1. Data Ingestion, QC & Temporal Synchronization                 │
  │     (MOSDAC Calibration: Counts → Kelvin Tb, Polar-to-Cartesian Radar Gridding)    │
  └────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │
                                           ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │                2. Convective Initiation (CI) & Storm Cell Detection                │
  │  - CI Scoring: Cold Cloud Top (Tb < 235K) + Rapid Cooling (dTb/dt) + CAPE / PW     │
  │  - Morphological Contouring, Centroid Resolution, Tracking & Persistent Lineage   │
  └────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │
                                           ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │                  3. Deep Learning Convective Extrapolation Engine                  │
  │  - Farneback Dense Optical Flow (64 Velocity Motion Vectors)                       │
  │  - Indian DWR ConvGRU Checkpoint (radar_convgru_india_20191107.pt, 30,369 params)  │
  │  - Multi-Horizon Extrapolation: +15m, +30m, +60m, +180m, +360m                     │
  │  - Dynamically Expanding Uncertainty Corridors (Cone of Uncertainty)               │
  └────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │
                                           ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │                     4. Multi-Hazard & Risk Assessment Engine                       │
  │  6 Discrete Neural/Physical Heads:                                                 │
  │  • Thunderstorm  • Hail  • Heavy Rain  • Cloudburst  • Downburst  • Lightning      │
  │  Composite Risk Scoring: Hazard Probability × Severity × Exposure × Uncertainty    │
  └────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │
                                           ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │                       5. Decision Support & GIS Interface                          │
  │  - 3D Terrain & Satellite Hybrid GIS Map (MapLibre GL + AWS Terrarium DEM)        │
  │  - Dynamic Floating Storm Information Boxes beside Real Markers                    │
  │  - 4 Simultaneous Scientific Sub-panels (TIR-1, DWR Reflectivity, RHI Cross-      │
  │    section, Optical Flow Vector Field)                                             │
  │  - AI Meteorological Forecaster Assistant (Structured 6-Section Executive Briefs) │
  │  - Human-in-the-Loop Alert Candidate Generation & Chief Meteorologist Approval    │
  └────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Scientific & Technological Innovations

### 1. Real Multi-Sensor Datasets (Zero Synthetic Data)
- **ISRO MOSDAC INSAT-3DR (HDF5 Level-1B Standard)**:
  - 9 sequential timeframes (03:00 to 07:00 UTC, 30-min interval) covering the Bay of Bengal and coastal belt.
  - Native count-to-Kelvin thermal calibration ($T_b \in [180\text{ K}, 325\text{ K}]$) for identifying cold, overshooting convective cores ($\min T_b < 205\text{ K}$, $-68^\circ\text{C}$).
- **ISRO TERLS C-Band Doppler Weather Radar (Thiruvananthapuram, ISRO)**:
  - 15 consecutive 10-minute historical volume scans on a $128 \times 128$ regional Cartesian grid.
  - Reflectivity ($Z \in [0, 70]\text{ dBZ}$), Vertically Integrated Liquid (VIL), and Echo Top heights up to $18\text{ km}$.
- **ECMWF ERA5 Atmospheric Reanalysis**:
  - Dynamically bound boundary-layer parameters: Convective Available Potential Energy (CAPE), Precipitable Water (PW), and surface $U_{10}$ / $V_{10}$ wind vector components ($23.8\text{ km/h}$, $205.8^\circ$ bearing).

### 2. Pre-Trained Deep Learning Nowcasting Model
- **Indian DWR ConvGRU (`radar_convgru_india_20191107.pt`, 30,369 parameters)**:
  - Sequence-to-one recurrent neural network trained on Indian Doppler Weather Radar reflectivity.
  - Predicts future convective reflectivity fields with fine non-linear growth and decay.
- **Farneback Dense Optical Flow**:
  - Computes 64 spatial motion vectors from radar echo transitions to capture non-rigid cloud motion.

### 3. Six Discrete Convective Hazard Models
Every replay frame evaluates 6 distinct convective hazard categories with calibrated probabilities:
1. **Severe Thunderstorm**: Based on convective initiation scoring, cloud-top cooling rates ($> 15\text{ K/hr}$), and radar echo intensity.
2. **Hail**: Overshooting cloud top thermal signal ($T_b < 205\text{ K}$), high VIL ($> 18\text{ kg/m}^2$), and strong environmental shear.
3. **Heavy Rainfall**: Reflectivity $Z \ge 35\text{ dBZ}$ and high precipitable water ($PW > 50\text{ mm}$).
4. **Cloudburst**: Extremely concentrated intense convective precipitation core ($Z \ge 45\text{ dBZ}$) with slow forward motion ($\le 15\text{ km/h}$).
5. **Microburst / Downburst**: Rapid storm core collapse and high vertical reflectivity gradient.
6. **Severe Lightning**: Glaciation-level cloud-top temperature ($T_b < 225\text{ K}$) and vertical updraft strength.

### 4. Location-Specific Arrival Countdown Engine
- Computes arrival times and real-time countdowns (`HH:MM:SS`) to critical population zones, ports, and tourist infrastructure (e.g., Chennai Coastal Zone, Paradeep Port, Visakhapatnam Harbor, Kolkata Urban Belt).
- Uses leading-edge contour intersection rather than naive single-point centroids.

### 5. Dynamic Map Information Boxes
- The 3D GIS Map renders small, dark, semi-translucent floating information boxes next to each active storm centroid.
- **Strictly Data-Driven**: Built exclusively from backend API fields (Storm ID, max dBZ, severity level, Farneback movement speed/direction, selected hazard probability, and target arrival times) without any hardcoded labels.
- Interactive: Clicking either the storm polygon, the centroid marker, or the info box selects the cell and loads the detailed telemetry panel.

### 6. AI Meteorological Forecaster Assistant
- Integrates Gemini LLM with structured meteorological prompts to produce formal, 6-section operational bulletins:
  1. *Executive Meteorological Summary*
  2. *Sensor Integration & Data Provenance*
  3. *Multi-Horizon Convective Evolution*
  4. *Multi-Hazard Assessment & Severe Thresholds*
  5. *Vulnerable Locations & Arrival Countdowns*
  6. *Recommended Immediate Action Items*
- Includes an interactive conversational drawer allowing duty officers to ask natural language questions (e.g., *"What is the primary driver of hail at +30m?"*).

---

## 📊 Replay Frame Progression Benchmark

Across the 15 historical replay frames (03:00 to 05:20 UTC), the model outputs dynamically evolve:

| Sequence | Replay UTC Time | Active Storms | Peak dBZ | Hail Prob | Downburst Prob | Lightning Prob | Primary Motion |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | `03:00:00 UTC` | 1 Cell | 29.3 dBZ | **62.7%** | **69.0%** | **71.9%** | 32.0 km/h NE |
| **4** | `03:40:00 UTC` | 1 Cell | 26.6 dBZ | **62.9%** | **69.0%** | **71.9%** | 32.0 km/h NE |
| **8** | `04:20:00 UTC` | 2 Cells | 30.0 dBZ | **63.2%** | **68.9%** | **71.9%** | 24.2 km/h NE |
| **14** | `05:20:00 UTC` | 6 Cells | 43.1 dBZ | **63.3%** | **68.9%** | **71.9%** | 25.5 km/h NE |

---

## 🖥️ User Interface & Dashboard Capabilities

| Panel | Description |
| :--- | :--- |
| **3D GIS Main Map** | MapLibre GL with MapTiler Satellite Hybrid tiles, 3D AWS Terrarium DEM terrain, real INSAT false-color overlay, DWR observed/predicted echoes, animated ERA5 wind streamlines, and expanding forecast uncertainty corridors. |
| **Sensor Strip** | Real-time sensor synchronization status: INSAT-3DR (HDF5), TERLS DWR, ERA5 U/V, IMERG, and LLDN Lightning. |
| **Timeline Controller** | 15-frame scrubber (03:00 to 05:20 UTC) with Play, Pause, Step-Forward, and Step-Backward controls. |
| **Right Storm Panel** | Interactive dropdown cell selector (`TERLS-STORM-001`, `002`, `003`), real radar scope preview, volumetric RHI vertical profile cross-section (0–18 km), and 6 multi-hazard cards. |
| **Scientific Sub-panels** | 4 bottom views: Panel 1 (INSAT-3DR TIR-1 False Color), Panel 2 (DWR Reflectivity with Range Rings), Panel 3 (Volumetric RHI Cross-Section), Panel 4 (Farneback Motion Vector Grid). |
| **Alert Workflow Modal** | Formulates Common Alerting Protocol (CAP) candidate alerts. Requires human meteorologist verification, commentary, and electronic signature before public dispatch. |

---

## 📂 Repository Directory Layout

```text
now cast/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST & WebSocket routers (health, storms, dwr_replay, alerts, ai, ws)
│   │   ├── models/          # Deep learning wrappers (dwr_convgru, era5_uv, downburst, hazard_heads)
│   │   ├── schemas/         # Pydantic state models & schemas
│   │   ├── services/        # Pipeline orchestration (forecasting, hazards, risk, arrival, satellite, ai)
│   │   ├── config.py        # Environment configuration
│   │   ├── database.py      # SQLite alert storage & session manager
│   │   └── main.py          # FastAPI application & SPA static server
│   ├── data/
│   │   ├── dwr/             # TERLS sequence files (terls_20191107_X.npy, results JSON)
│   │   ├── models/          # Pre-trained PyTorch checkpoints (*.pt)
│   │   └── raw/             # Calibrated MOSDAC INSAT-3DR HDF5 files (*.h5)
│   └── tests/               # 9 comprehensive pytest test suites (39 tests, 100% pass)
├── frontend/
│   ├── src/
│   │   ├── components/      # GisMap, RightStormPanel, ScientificPanels, TimelineControl, Header, etc.
│   │   ├── services/        # api.js API client & WebSocket connector
│   │   ├── App.jsx          # Root dashboard container
│   │   └── index.css        # Tailored dark-mode glassmorphic styling
│   ├── dist/                # Pre-built production bundle (served directly on Render)
│   ├── package.json         # React 18, Vite 6, MapLibre GL
│   └── vite.config.js       # Vite build & proxy configuration
├── Dockerfile               # Production multi-stage Docker build
├── render.yaml              # Render Blueprint specification
└── requirements.txt         # Python dependencies (FastAPI, PyTorch CPU, NumPy, OpenCV, Shapely)
```

---

## 🚀 Quickstart: Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ReshiArasu-D/Tech-wheelers_174.git
cd Tech-wheelers_174
```

### 2. Set Up the Backend
```bash
# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install Python dependencies (CPU-optimized PyTorch avoids large CUDA downloads)
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Start the FastAPI server (runs on port 8000)
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Set Up the Frontend
In a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server (runs on port 3001 or 3000)
npm run dev
```

Open your browser at **`http://localhost:3001`** (or `http://localhost:3000`).

---

## 🧪 Automated Test Suite

The test suite validates every module across data ingestion, HDF5 calibration, ConvGRU inference, Farneback optical flow, risk calculation, arrival countdowns, and the Human-in-the-Loop alert workflow:

```bash
python -m pytest backend/tests/
```

### Verification Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.14.4, pytest-9.1.1, pluggy-1.6.0
rootdir: D:\now cast
collected 39 items

backend\tests\test_ai_endpoints.py ...                                   [  7%]
backend\tests\test_api_endpoints.py ......                               [ 23%]
backend\tests\test_detection_and_tracking.py ...                         [ 30%]
backend\tests\test_dwr_pipeline.py .......                               [ 48%]
backend\tests\test_hazards_and_risk.py ..                                [ 53%]
backend\tests\test_integration_sih26084.py ......                        [ 69%]
backend\tests\test_model_loading.py ....                                 [ 79%]
backend\tests\test_models.py ....                                        [ 89%]
backend\tests\test_satellite_reader.py ....                              [100%]

====================== 39 passed in 52.11s ======================
```
**Pass Rate: 39 / 39 (100% Pass Rate)**

---

## ☁️ Deployment on Render

This repository is pre-configured for **Render** via [`render.yaml`](./render.yaml) and [`Dockerfile`](./Dockerfile):

### Single-Service Unified Deployment (Zero Extra Configuration)
[`backend/app/main.py`](./backend/app/main.py) automatically detects and serves the React SPA from [`frontend/dist`](./frontend/dist). A single Web Service on Render simultaneously serves:
- The React 3D Dashboard on `/`
- All FastAPI REST endpoints on `/events`, `/storms`, `/dwr/...`, etc.
- WebSockets on `/ws/live`
- Interactive OpenAPI documentation on `/docs`

**Live URL**: [**https://now-casr.onrender.com**](https://now-casr.onrender.com)

---

## 👥 The Team

**Team: Tech Wheelers**  
*Smart India Hackathon (SIH 2026)*  
*Problem Statement 26084: Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0–6 hr)*
