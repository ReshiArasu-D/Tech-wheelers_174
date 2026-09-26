FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (libglib2.0-0, libgl1-mesa-glx for OpenCV headless)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run HDF5 pre-conversion to ensure dataset cache is generated
RUN python backend/scripts/convert_insat_to_hdf5.py

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
