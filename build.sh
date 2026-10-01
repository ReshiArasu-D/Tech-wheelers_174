#!/usr/bin/env bash
# Render Build Script for CO-NOWCAST Frontend (https://now-casr.onrender.com)
set -e

echo "=== Building React Frontend (Backend hosted on Vercel) ==="
cd frontend
npm install --no-audit --no-fund
npm run build
cd ..

echo "=== Frontend Build Succeeded! Dist ready at frontend/dist ==="
