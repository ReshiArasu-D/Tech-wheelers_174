# Data Sources Documentation

## INSAT-3D TIR1 (Thermal Infrared Channel 1)

- **Satellite**: INSAT-3D (Indian National Satellite System), operated by ISRO
- **Sensor**: IMAGER
- **Channel**: TIR1 (10.8 µm central wavelength)
- **Native Resolution**: ~3.7 km at sub-satellite point (82.5°E)
- **Temporal Cadence**: 30 minutes (full disk), 15 minutes (sector scan)
- **Data Format**: HDF5 (Level-1B Standard from MOSDAC)
- **Archive Source**: MOSDAC (https://mosdac.gov.in/) via Kaggle dataset `knowhrishi/insat3d-india`
- **Prototype Dataset**: 07-NOV-2019 Bay of Bengal Severe Convective Storm (Cyclone Bulbul precursor)
- **Frames Used**: 9 sequential frames (03:00–07:00 UTC, 30 min cadence)
- **Region**: 10.06°N–24.01°N, 79.99°E–93.94°E (Eastern Coast & Bay of Bengal)
- **Grid Shape**: 417 × 417 pixels

### HDF5 Dataset Keys
```
IMG_TIR1       - Raw counts (uint16)
IMG_TIR1_TEMP  - Brightness Temperature in Kelvin (float32)
Latitude       - 2D latitude grid (float32)
Longitude      - 2D longitude grid (float32)
```

### Brightness Temperature Interpretation
```
Tb > 280 K    → Clear sky / warm surface
260–280 K     → Low-level clouds / clear atmosphere
235–260 K     → Mid-level clouds / convective initiation threshold
215–235 K     → Active deep convection
200–215 K     → Severe convective core / tall cumulonimbus
< 200 K       → Overshooting convective top (extremely severe)
```

## ERA5 Reanalysis (ECMWF)

- **Source**: Copernicus Climate Data Store
- **Resolution**: 0.25° × 0.25° (~28 km)
- **Temporal Resolution**: Hourly
- **Parameters Used**:
  - CAPE (Convective Available Potential Energy, J/kg)
  - CIN (Convective Inhibition, J/kg)
  - Precipitable Water (Total Column Water Vapor, mm)
  - 0–6 km Bulk Wind Shear (m/s)
  - Freezing Level Height (m)
- **Status in Prototype**: Realistic synoptic values from the 07-NOV-2019 event

## DWR Doppler Weather Radar (Production Only)

- **Network**: IMD S-Band / C-Band radar network
- **Resolution**: 0.5–1.0 km (primary analysis grid anchor)
- **Products**: Reflectivity (dBZ), Radial Velocity (m/s), Spectrum Width
- **Status in Prototype**: UNAVAILABLE — sensor mask shows "unavailable"

## Lightning Detection Network (Production Only)

- **Network**: Lightning Location and Detection Network (LLDN)
- **Products**: Flash density, flash rate, cloud-to-ground ratio
- **Status in Prototype**: UNAVAILABLE — proxied by convective intensity
