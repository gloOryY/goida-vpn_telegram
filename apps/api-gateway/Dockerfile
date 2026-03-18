# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/
COPY packages/shared/package*.json ./packages/shared/
COPY tsconfig.json ./
COPY apps/api-gateway/tsconfig.json ./apps/api-gateway/

RUN npm ci --workspace=apps/api-gateway --workspace=packages/shared

COPY packages/shared ./packages/shared
COPY apps/api-gateway/src ./apps/api-gateway/src

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api-gateway

# ─── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --workspace=apps/api-gateway --workspace=packages/shared --omit=dev

COPY --from=builder /app/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/api-gateway/dist/index.js"]
