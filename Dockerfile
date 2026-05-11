# ── builder ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_BASE is injected at build time so the compiled JS knows the API path.
# In production this is "/api" (Caddy strips the prefix before forwarding).
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
