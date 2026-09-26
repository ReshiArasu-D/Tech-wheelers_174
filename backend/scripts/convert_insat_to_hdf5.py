"""
Convert real historical INSAT-3D TIR1 data into standard ISRO/MOSDAC HDF5 format.
Event: 07-NOV-2019 Severe Convective Storm & Cyclone Bulbul (Bay of Bengal & Coastal India)
"""
import os
import re
import datetime
import h5py
import numpy as np
import tifffile

SOURCE_DIR = r"C:\Users\hp\.cache\kagglehub\datasets\knowhrishi\insat3d-india\versions\2\INSAT3D_TIR1_India"
DEST_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
os.makedirs(DEST_DIR, exist_ok=True)

# Selected time frames for intense convective progression (every 30 mins)
FRAMES = [
    "3DIMG_07NOV2019_0300_L1C_SGP.tif",
    "3DIMG_07NOV2019_0330_L1C_SGP.tif",
    "3DIMG_07NOV2019_0400_L1C_SGP.tif",
    "3DIMG_07NOV2019_0430_L1C_SGP.tif",
    "3DIMG_07NOV2019_0500_L1C_SGP.tif",
    "3DIMG_07NOV2019_0530_L1C_SGP.tif",
    "3DIMG_07NOV2019_0600_L1C_SGP.tif",
    "3DIMG_07NOV2019_0630_L1C_SGP.tif",
    "3DIMG_07NOV2019_0700_L1C_SGP.tif",
]

# Georeferencing parameters from the GeoTIFF
# ModelTiepoint: (0.0, 0.0, 0.0, 62.9883746791066, 38.02897834557538, 0.0)
# ModelPixelScale: (0.03353227354064445, 0.03353227354064445, 0.0)
TOP_LAT = 38.02897834557538
LEFT_LON = 62.9883746791066
PIXEL_SCALE = 0.03353227354064445

# Regional bounding box for the convective storm system (East Coast & Bay of Bengal)
# Covers 10.0°N to 24.0°N, 80.0°E to 94.0°E
TARGET_MIN_LAT = 10.0
TARGET_MAX_LAT = 24.0
TARGET_MIN_LON = 80.0
TARGET_MAX_LON = 94.0

def convert_all():
    r_start = int((TOP_LAT - TARGET_MAX_LAT) / PIXEL_SCALE)
    r_end = int((TOP_LAT - TARGET_MIN_LAT) / PIXEL_SCALE)
    c_start = int((TARGET_MIN_LON - LEFT_LON) / PIXEL_SCALE)
    c_end = int((TARGET_MAX_LON - LEFT_LON) / PIXEL_SCALE)

    rows = r_end - r_start
    cols = c_end - c_start

    # Generate 2D Latitude and Longitude coordinate matrices
    lat_vector = np.array([TOP_LAT - (r_start + i) * PIXEL_SCALE for i in range(rows)], dtype=np.float32)
    lon_vector = np.array([LEFT_LON + (c_start + j) * PIXEL_SCALE for j in range(cols)], dtype=np.float32)
    lat_grid, lon_grid = np.meshgrid(lat_vector, lon_vector, indexing="ij")

    print(f"Region grid: Lat [{lat_grid.min():.2f}, {lat_grid.max():.2f}], Lon [{lon_grid.min():.2f}, {lon_grid.max():.2f}], Shape: {lat_grid.shape}")

    for fname in FRAMES:
        src_path = os.path.join(SOURCE_DIR, fname)
        if not os.path.exists(src_path):
            print(f"File not found: {src_path}")
            continue

        raw_data = tifffile.imread(src_path)
        crop_data = raw_data[r_start:r_end, c_start:c_end]

        # Extract timestamp from filename, e.g., 3DIMG_07NOV2019_0600_L1C_SGP.tif
        match = re.search(r"3DIMG_(\d{2}[A-Z]{3}\d{4})_(\d{4})_", fname)
        if match:
            date_str, time_str = match.groups()
            dt = datetime.datetime.strptime(f"{date_str} {time_str}", "%d%b%Y %H%M")
            iso_time = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            h5_name = f"3DIMG_{date_str}_{time_str}_L1B_STD.h5"
        else:
            iso_time = "2019-11-07T00:00:00Z"
            h5_name = fname.replace(".tif", ".h5")

        # Invert counts to Kelvin Brightness Temperature (Tb):
        # High count (~950) = Cold convective cloud top (~190 K)
        # Low count (~540) = Warm ocean surface (~305 K)
        tb_kelvin = 305.0 - (crop_data - 540.0) * (115.0 / 410.0)
        tb_kelvin = np.clip(tb_kelvin, 180.0, 325.0).astype(np.float32)

        # Raw counts (10-bit integer)
        counts = crop_data.astype(np.uint16)

        out_path = os.path.join(DEST_DIR, h5_name)
        with h5py.File(out_path, "w") as hf:
            hf.attrs["satellite_name"] = "INSAT-3D"
            hf.attrs["sensor"] = "IMAGER"
            hf.attrs["channel"] = "TIR1"
            hf.attrs["nominal_central_wavelength_um"] = 10.8
            hf.attrs["spatial_resolution_km"] = 3.7
            hf.attrs["timestamp"] = iso_time
            hf.attrs["event_id"] = "EVENT-20191107-BOB-01"
            hf.attrs["event_name"] = "Severe Convective Storm / Bulbul"
            hf.attrs["min_lat"] = float(lat_grid.min())
            hf.attrs["max_lat"] = float(lat_grid.max())
            hf.attrs["min_lon"] = float(lon_grid.min())
            hf.attrs["max_lon"] = float(lon_grid.max())

            hf.create_dataset("IMG_TIR1", data=counts, compression="gzip")
            hf.create_dataset("IMG_TIR1_TEMP", data=tb_kelvin, compression="gzip")
            hf.create_dataset("Latitude", data=lat_grid, compression="gzip")
            hf.create_dataset("Longitude", data=lon_grid, compression="gzip")

        print(f"Created HDF5 file: {h5_name} | Shape: {tb_kelvin.shape} | Tb range: {tb_kelvin.min():.1f}K to {tb_kelvin.max():.1f}K | Time: {iso_time}")

if __name__ == "__main__":
    convert_all()
