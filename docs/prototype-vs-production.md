# Prototype vs Production Specification

## Sensor Coverage

| Sensor | Prototype | Production |
|--------|-----------|------------|
| INSAT-3D/3DR TIR1 | ✅ Real historical HDF5 | ✅ Real-time L1B feed from MOSDAC |
| ERA5 Reanalysis | ✅ Historical environmental context | ✅ Near-real-time ERA5T (6h latency) |
| DWR Doppler Radar | ❌ Unavailable | ✅ IMD S-Band / C-Band network |
| Lightning Network | ❌ Unavailable | ✅ LLDN flash density & rate |

## Resolution

| Parameter | Prototype | Production |
|-----------|-----------|------------|
| Analysis Grid | 3.7 km (INSAT native) | 1–3 km (radar-anchored) |
| INSAT TIR1 | 3.7 km native | 3.7 km (contextual, not primary) |
| ERA5 | 0.25° (~28 km) | 0.25° (~28 km) |
| DWR | N/A | 0.5–1.0 km (primary) |

**IMPORTANT**: INSAT does NOT have 1 km native resolution. The production system uses a radar-anchored 1–3 km model/output grid. INSAT is coarser and must be treated as a contextual modality.

## Convective Initiation

| Feature | Prototype | Production |
|---------|-----------|------------|
| Tb threshold & cooling rate | ✅ | ✅ |
| ERA5 CAPE/CIN/PW | ✅ | ✅ |
| Radar echo growth | ❌ | ✅ |
| Lightning onset detection | ❌ | ✅ |
| Radar velocity signatures | ❌ | ✅ |

**Prototype CI = reduced-feature INSAT + ERA5**

## Hazard Assessment

| Hazard | Prototype Basis | Production Basis |
|--------|----------------|-----------------|
| Lightning | Convective intensity proxy (Tb + cooling) | Flash density/rate from LLDN |
| Hail | Cold core Tb + CAPE proxy | Reflectivity core + echo-top + CAPE + freezing level |
| Downburst | Intensity trend proxy | DWR radial velocity divergence + storm structure |
| Cloudburst | Satellite rainfall-rate proxy | Gauge-verified rainfall accumulation (IMD: ≥100mm/hr) |

## Uncertainty

| Aspect | Prototype | Production |
|--------|-----------|------------|
| Classification | Temperature scaling | Temperature scaling + field calibration |
| Continuous | Conformal prediction intervals | Conformal + ensemble spread |
| Sensor dropout | Simulated via dashboard toggle | Real-time sensor health monitoring |
| Calibration data | Single historical event | Multi-year operational verification |

## What the Prototype Does NOT Claim

- ❌ Does NOT claim 1 km native INSAT resolution
- ❌ Does NOT claim satellite-only hail detection is operationally validated
- ❌ Does NOT claim downburst detection without radar velocity
- ❌ Does NOT claim cloudburst threshold without referencing official IMD definition
- ❌ Does NOT claim fully calibrated uncertainty without field measurements
- ❌ Does NOT call historical replay "live"
- ❌ Does NOT fabricate DWR or lightning data
