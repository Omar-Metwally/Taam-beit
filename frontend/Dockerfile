# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Cache npm install layer separately from source
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .

# Pass MinIO public URL as build arg so Vite can embed it
ARG VITE_MINIO_PUBLIC_URL=http://localhost:9000
ENV VITE_MINIO_PUBLIC_URL=$VITE_MINIO_PUBLIC_URL

RUN npm run build

# ── Stage 2: Nginx runtime ────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS final

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the Vite build output
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx runs on port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
