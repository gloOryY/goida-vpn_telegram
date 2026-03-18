# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/telegram-bot/package*.json ./apps/telegram-bot/
COPY packages/shared/package*.json ./packages/shared/
COPY tsconfig.json ./
COPY apps/telegram-bot/tsconfig.json ./apps/telegram-bot/

RUN npm ci --workspace=apps/telegram-bot --workspace=packages/shared

COPY packages/shared ./packages/shared
COPY apps/telegram-bot/src ./apps/telegram-bot/src

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/telegram-bot

# ─── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/telegram-bot/package*.json ./apps/telegram-bot/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --workspace=apps/telegram-bot --workspace=packages/shared --omit=dev

COPY --from=builder /app/apps/telegram-bot/dist ./apps/telegram-bot/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

CMD ["node", "apps/telegram-bot/dist/index.js"]
