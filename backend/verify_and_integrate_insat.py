"""
Verification and Integration script for MOSDAC INSAT-3D/3DR Level-1C SGP files.
Audits timestamp compatibility, latitude/longitude bounds, TIR1 availability,
and spatial overlap with the TERLS DWR storm (8.85°N, 76.82°E).
"""
import os
import re
import datetime
import h5py
import numpy as np

TERLS_LAT = 8.85
TERLS_LON = 76.82
REPLAY_TIMESTAMPS = [
    "2019-11-07T03:00:00Z", "2019-11-07T03:10:00Z", "2019-11-07T03:20:00Z",
    "2019-11-07T03:30:00Z", "2019-11-07T03:40:00Z", "2019-11-07T03:50:00Z",
    "2019-11-07T04:00:00Z", "2019-11-07T04:10:00Z", "2019-11-07T04:20:00Z",
    "2019-11-07T04:30:00Z", "2019-11-07T04:40:00Z", "2019-11-07T04:50:00Z",
    "2019-11-07T05:00:00Z", "2019-11-07T05:10:00Z", "2019-11-07T05:20:00Z"
]

def verify_insat_file(filepath: str):
    fname = os.path.basename(filepath)
    print("=" * 80)
    print(f"VERIFYING MOSDAC PRODUCT: {fname}")
    print("=" * 80)

    if not os.path.exists(filepath):
        print(f"[ERROR] File not found: {filepath}")
        return False

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"File size: {size_mb:.2f} MB")

    # 1. Parse timestamp from filename
    m = re.search(r"3[DR]IMG_(\d{2}[A-Z]{3}\d{4})_(\d{4})_", fname)
    if not m:
        print("[ERROR] Cannot parse standard MOSDAC timestamp from filename pattern.")
        return False

    date_str, time_str = m.groups()
    dt = datetime.datetime.strptime(f"{date_str} {time_str}", "%d%b%Y %H%M")
    iso_time = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"Acquisition Timestamp: {iso_time}")

    # Check temporal proximity to 03:00 - 05:20 UTC
    t0 = datetime.datetime(2019, 11, 7, 3, 0)
    t_end = datetime.datetime(2019, 11, 7, 5, 20)
    time_diff_min = (dt - t0).total_seconds() / 60.0
    print(f"Time difference to DWR Replay Start (03:00 UTC): {time_diff_min:+.1f} minutes")

    is_time_compatible = (-30.0 <= time_diff_min <= (t_end - t0).total_seconds() / 60.0 + 30.0)
    print(f"Temporal Compatibility: {'VALID (Matched to replay event)' if is_time_compatible else 'INVALID (Mismatch > 30 min)'}")

    # 2. Inspect HDF5 structure
    with h5py.File(filepath, "r") as hf:
        keys = list(hf.keys())
        print(f"HDF5 Datasets present: {len(keys)} datasets ({', '.join(keys[:8])}...)")

        has_tir1 = ("IMG_TIR1" in hf)
        has_tir1_temp = ("IMG_TIR1_TEMP" in hf)
        print(f"TIR1 Channel Raw Data (IMG_TIR1): {'YES' if has_tir1 else 'NO'}")
        print(f"TIR1 Calibration LUT (IMG_TIR1_TEMP): {'YES' if has_tir1_temp else 'NO'}")

        if not (has_tir1 and has_tir1_temp):
            print("[ERROR] Missing required Thermal Infrared 1 (TIR1) payload.")
            return False

        # 3. Calculate Geolocation Bounds
        if "X" in hf and "Y" in hf:
            x = hf["X"][:]
            y = hf["Y"][:]
            R = 6378137.0
            lon_0 = 75.0
            lons_all = lon_0 + np.degrees(x / R)
            lats_all = np.degrees(2.0 * np.arctan(np.exp(y / R)) - np.pi / 2.0)
            full_lat_min, full_lat_max = float(np.min(lats_all)), float(np.max(lats_all))
            full_lon_min, full_lon_max = float(np.min(lons_all)), float(np.max(lons_all))
            print(f"Product Projection: Standard Geostationary Projection (SGP, lon_0 = {lon_0}°E)")
            print(f"Full-Disk Geographic Bounds: Lat [{full_lat_min:.2f}°, {full_lat_max:.2f}°], Lon [{full_lon_min:.2f}°, {full_lon_max:.2f}°]")

            # Regional extraction domain for India & Kerala
            y_idx = np.where((lats_all >= 6.5) & (lats_all <= 25.0))[0]
            x_idx = np.where((lons_all >= 73.0) & (lons_all <= 94.0))[0]
            sub_lats = lats_all[y_idx[0]:y_idx[-1]+1]
            sub_lons = lons_all[x_idx[0]:x_idx[-1]+1]
            lat_min, lat_max = float(np.min(sub_lats)), float(np.max(sub_lats))
            lon_min, lon_max = float(np.min(sub_lons)), float(np.max(sub_lons))
            print(f"Peninsular Ingestion Bounds: Lat [{lat_min:.2f}°, {lat_max:.2f}°], Lon [{lon_min:.2f}°, {lon_max:.2f}°]")
        elif "Latitude" in hf and "Longitude" in hf:
            lats = hf["Latitude"][:]
            lons = hf["Longitude"][:]
            lat_min, lat_max = float(np.min(lats)), float(np.max(lats))
            lon_min, lon_max = float(np.min(lons)), float(np.max(lons))
            print(f"Geographic Bounds: Lat [{lat_min:.2f}°, {lat_max:.2f}°], Lon [{lon_min:.2f}°, {lon_max:.2f}°]")
        else:
            print("[ERROR] Unrecognized geolocation structure in HDF5 file.")
            return False

        # 4. Check Spatial Overlap with TERLS Storm
        covers_lat = (lat_min <= TERLS_LAT <= lat_max)
        covers_lon = (lon_min <= TERLS_LON <= lon_max)
        has_overlap = covers_lat and covers_lon

        print(f"Selected TERLS Storm Centroid: ({TERLS_LAT:.2f}°N, {TERLS_LON:.2f}°E)")
        print(f"Contains Storm Latitude ({TERLS_LAT:.2f}°N in [{lat_min:.2f}°, {lat_max:.2f}°])? {covers_lat}")
        print(f"Contains Storm Longitude ({TERLS_LON:.2f}°E in [{lon_min:.2f}°, {lon_max:.2f}°])? {covers_lon}")
        print(f"Spatial Overlap Status: {'GENUINE SPATIAL OVERLAP' if has_overlap else 'NO SPATIAL OVERLAP'}")

        # 5. Extract Brightness Temperature at Storm Centroid
        if has_overlap and "X" in hf and "Y" in hf:
            lut = np.array(hf["IMG_TIR1_TEMP"][:], dtype=np.float32)
            c_y_idx = int(np.argmin(np.abs(sub_lats - TERLS_LAT)))
            c_x_idx = int(np.argmin(np.abs(sub_lons - TERLS_LON)))
            tir1_sub = hf["IMG_TIR1"][0, y_idx[0]:y_idx[-1]+1, x_idx[0]:x_idx[-1]+1] if hf["IMG_TIR1"].ndim == 3 else hf["IMG_TIR1"][y_idx[0]:y_idx[-1]+1, x_idx[0]:x_idx[-1]+1]
            raw_val = tir1_sub[c_y_idx, c_x_idx]
            tb_val = float(lut[min(raw_val, len(lut)-1)])
            print(f"Real MOSDAC Brightness Temperature at Storm Centroid: {tb_val:.1f} K ({-273.15 + tb_val:.1f}°C)")

        eligible = is_time_compatible and has_overlap
        print("=" * 80)
        print(f"FINAL ELIGIBILITY FOR DWR + INSAT MULTIMODAL FUSION: {'ELIGIBLE (YES)' if eligible else 'NOT ELIGIBLE (NO)'}")
        print("=" * 80)
        return eligible

if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target:
        verify_insat_file(target)
    else:
        print("Usage: python verify_and_integrate_insat.py <path_to_h5_file>")
