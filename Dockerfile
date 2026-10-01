# Lightweight Frontend-Only Container for Render (https://now-casr.onrender.com)
# Backend is completely offloaded to Vercel (co-nowcasr.vercel.app)
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
ENV PORT=10000
EXPOSE 10000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-10000}"]
