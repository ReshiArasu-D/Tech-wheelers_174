# Validation & Testing Documentation

## Test Suite

All tests are located in `backend/tests/` and executed via:

```bash
python -m pytest backend/tests/
```

### Test Coverage

| Test File | Tests | Domain |
|-----------|-------|--------|
| `test_satellite_reader.py` | 4 | HDF5 ingestion, Tb extraction, georeferencing, ERA5 context |
| `test_detection_and_tracking.py` | 3 | CI scoring, storm cell detection, tracking with lineage |
| `test_models.py` | 4 | Optical flow, ConvGRU residual inference, multi-horizon, uncertainty |
| `test_hazards_and_risk.py` | 2 | 4 hazard proxies with disclaimers, risk engine + arrival |
| `test_api_endpoints.py` | 6 | All HTTP endpoints including predict/frame and alert approval |
| **Total** | **19** | Full end-to-end pipeline coverage |

## Validation Approach

### What We Validate

1. **Data integrity**: Real INSAT-3D HDF5 files load correctly with valid Tb ranges (180–330 K)
2. **Georeferencing**: Lat/Lon grids match expected Indian subcontinent bounds
3. **Detection**: Storm cells detected with realistic areas (>150 km²) and valid polygon geometries
4. **Tracking**: Persistent IDs maintained across frames; CONTINUE lineage records generated
5. **Motion**: Optical flow produces valid velocity vectors with realistic storm speeds
6. **ConvGRU**: Residual output is bounded within [-0.35, +0.35] as designed
7. **Uncertainty monotonicity**: Uncertainty increases with forecast lead time
8. **Sensor degradation**: Missing sensors widen conformal prediction intervals
9. **Scientific labels**: All 4 hazard outputs contain required "proxy" disclaimer text
10. **IMD reference**: Cloudburst output references official IMD definition
11. **API contracts**: All endpoints return 200 with expected JSON structure

### What We Do NOT Claim

- ❌ No skill scores (CSI, POD, FAR) computed — insufficient independent verification data
- ❌ No operational accuracy numbers fabricated
- ❌ Uncertainty calibration is preliminary — needs multi-event field validation
- ❌ ConvGRU model labeled as "demonstration/trial model"

### Qualitative Validation

The dashboard **Historical Storm Replay** feature allows evaluators to:
1. Scrub through 9 real INSAT-3D frames (03:00–07:00 UTC)
2. Observe storm cell detection evolving with each frame
3. Compare Persistence vs Optical Flow vs ConvGRU forecast quality
4. Observe uncertainty expanding at longer horizons
5. Observe confidence degrading under simulated sensor dropout
