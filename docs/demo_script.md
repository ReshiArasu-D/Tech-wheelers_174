# SIH 2026 — 5-Minute Evaluation & Demo Script

**Project**: CO-NOWCAST (Problem Statement 26084)  
**Theme**: Convective Scale Nowcasting for Thunderstorms, Hail & Cloudbursts (0–6 hr)  
**Team**: Tech Wheelers

---

## 1. Executive Summary (30 Seconds)

> *"Good morning, esteemed judges. We present **CO-NOWCAST**, a real-time convective-scale nowcasting decision support system designed for IMD and State Disaster Management Authorities.*
>
> *Severe convection causes catastrophic loss across India within 1 to 2 hours. Traditional Numerical Weather Prediction (NWP) models update every 6 hours and have grid resolutions too coarse to capture convective initiation. Pure deep learning "black boxes" fail catastrophically under sensor dropouts.*
>
> *CO-NOWCAST bridges this gap: a physics-anchored AI hybrid combining dense optical flow advection with a ConvGRU residual learning network, calibrated uncertainty, multi-hazard proxies, and an operational human-in-the-loop alert approval pipeline."*

---

## 2. Interactive Dashboard Walkthrough (3 Minutes)

### Step 1: Real INSAT-3D Historical Replay (Eastern Coast & Bay of Bengal)
- **Action**: Click the **Play** button on the bottom `ReplayTimeline` or scrub through frames from `03:00 UTC` to `07:00 UTC`.
- **Talking Point**:
  > *"Notice how the system tracks Cyclone Bulbul’s precursor deep convective storm over the Bay of Bengal and Odisha/West Bengal coastline using real INSAT-3D TIR1 data ingested from MOSDAC. Each cell is assigned a persistent identifier (e.g., `STORM-001`, `STORM-002`) and tracks lineage across merges and splits."*

### Step 2: Forecast Horizon Stepper (0–6 Hours)
- **Action**: Click across the forecast horizons on top: `NOW` → `+15m` → `+30m` → `+60m` → `+3h` → `+6h`.
- **Talking Point**:
  > *"Notice the multi-scale forecast design: at **+15m, +30m, and +60m**, the system predicts discrete storm contours and motion vectors. At **+3h and +6h**, the deterministic polygons gracefully expand into broad probabilistic corridors. Convective cells cannot be tracked deterministically beyond 2 hours; claiming pinpoint polygons at 6 hours is scientifically ungrounded."*

### Step 3: Model Comparison Panel (Physics vs AI)
- **Action**: Expand the `Model Comparison` panel on the right sidebar.
- **Talking Point**:
  > *"Here we benchmark three paradigms side-by-side:
  > 1. **Persistence (Baseline 1)**: Assumes frozen state.
  > 2. **Farneback Dense Optical Flow (Baseline 2)**: Advects precipitation/cooling fields along motion vectors.
  > 3. **ConvGRU Residual (Proposed AI)**: Learns convective intensification and decay residuals bounded within [-0.35, +0.35] on top of optical flow.
  > By predicting residuals rather than raw images, our AI model is physically bounded and cannot hallucinate ghost storms."*

### Step 4: Multi-Hazard Diagnostic Panel (Scientific Honesty)
- **Action**: Click through the 4 hazard tabs: **Lightning**, **Hail**, **Downburst**, and **Cloudburst**.
- **Talking Point**:
  > *"We uphold strict scientific honesty. Every hazard displays clear provenance badges:
  > - **Lightning**: Cloud-top glaciation ($T_b < 225\text{ K}$) and cooling rates serve as an operational proxy.
  > - **Hail**: Derived from overshooting tops ($T_b < 205\text{ K}$) combined with ERA5 CAPE ($> 2000\text{ J/kg}$) and vertical wind shear.
  > - **Downburst**: Derived from cloud-top collapse trends.
  > - **Cloudburst**: Evaluated against the official IMD definition ($\ge 100\text{ mm/hr}$) using deep convective core proxies.
  > In production, these ingest Doppler Weather Radar (DWR) radial velocity and ground lightning networks (LLDN)."*

### Step 5: Sensor Availability & Graceful Degradation
- **Action**: Toggle the `DWR Radar` or `Lightning` sensor switches in the `Sensor Availability Mask` panel.
- **Talking Point**:
  > *"Real-world operations face sensor outages. Notice how our conformal prediction intervals dynamically expand and confidence scores scale down when sensor dropout occurs. The system never crashes or gives false certainty."*

### Step 6: Critical Target Arrival Countdown & Human Sign-off
- **Action**: Highlight the `Arrival Countdown` in the bottom right panel (e.g., *Kolkata Port: 00:42:18*). Then click **Review Alert Candidate** and click **Approve & Disseminate**.
- **Talking Point**:
  > *"Rather than generic district warnings, our Arrival Engine calculates leading-edge contour intersection ETAs for critical infrastructure.
  > Furthermore, following National Disaster Management Guidelines, **no automated alert is blasted without human-in-the-loop sign-off**. The operator reviews the calibrated risk score, confirms the storm polygon, and signs off with an audit trail stored in our database."*

---

## 3. Defense against Tough Questions (1.5 Minutes)

| Question | Defensible Answer |
|---|---|
| **Why is your prototype at 3.7 km rather than 1 km?** | *"INSAT-3D Imager native resolution at sub-satellite longitude is ~3.7 km for TIR1. Claiming 1 km native satellite resolution without Doppler radar would be factually incorrect. In our production architecture, the primary analysis grid is 1 km anchored by IMD's S/C-band Doppler Weather Radars, with INSAT providing synoptic context."* |
| **Why not use an end-to-end Diffusion or Transformer model?** | *"Pure generative end-to-end models suffer from spatial blur at longer horizons or hallucinate storms that violate mass and momentum conservation. By combining Farneback optical flow advection with a ConvGRU residual network bounded between $[-0.35, +0.35]$, we guarantee physical consistency while capturing non-linear convective growth."* |
| **How does your uncertainty calibration work?** | *"We employ dual-tier uncertainty quantification: Temperature Scaling calibrated against Brier score for categorical hazard probabilities, and Split Conformal Prediction intervals for continuous brightness temperatures. Crucially, the quantiles widen adaptively based on both forecast lead time and the active sensor availability mask."* |
| **How does this scale to all of India?** | *"The inference engine is completely stateless and tiles regions with 20–30 km overlap. A single set of ConvGRU model weights runs across all regions, while regional calibration lookup tables account for localized orography and climatology."* |

---

## 4. Closing Remark (15 Seconds)

> *"CO-NOWCAST is not a concept mockup. It is a working, tested end-to-end system with 19 passing validation tests, real INSAT-3D data ingestion, calibrated uncertainty, and human-governed alert dissemination ready for IMD operational deployment. Thank you."*
