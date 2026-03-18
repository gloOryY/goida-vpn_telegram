FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/notification-service/package*.json ./apps/notification-service/
COPY packages/shared/package*.json ./packages/shared/
COPY tsconfig.json ./
COPY apps/notification-service/tsconfig.json ./apps/notification-service/
RUN npm ci --workspace=apps/notification-service --workspace=packages/shared
COPY packages/shared ./packages/shared
COPY apps/notification-service/src ./apps/notification-service/src
COPY apps/notification-service/migrations ./apps/notification-service/migrations
RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/notification-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/notification-service/package*.json ./apps/notification-service/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/notification-service --workspace=packages/shared --omit=dev
COPY --from=builder /app/apps/notification-service/dist ./apps/notification-service/dist
COPY --from=builder /app/apps/notification-service/migrations ./apps/notification-service/migrations
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3004/health || exit 1
CMD ["node", "apps/notification-service/dist/index.js"]
