# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./
COPY apps/auth-service/package*.json ./apps/auth-service/
COPY packages/shared/package*.json ./packages/shared/
COPY tsconfig.json ./
COPY apps/auth-service/tsconfig.json ./apps/auth-service/

# Устанавливаем зависимости
RUN npm ci --workspace=apps/auth-service --workspace=packages/shared

# Копируем исходный код
COPY packages/shared ./packages/shared
COPY apps/auth-service/src ./apps/auth-service/src
COPY apps/auth-service/migrations ./apps/auth-service/migrations

# Собираем
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/auth-service

# ─── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/auth-service/package*.json ./apps/auth-service/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --workspace=apps/auth-service --workspace=packages/shared --omit=dev

# Копируем собранные артефакты
COPY --from=builder /app/apps/auth-service/dist ./apps/auth-service/dist
COPY --from=builder /app/apps/auth-service/migrations ./apps/auth-service/migrations
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "apps/auth-service/dist/index.js"]
