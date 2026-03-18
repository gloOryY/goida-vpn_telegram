FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/payment-service/package*.json ./apps/payment-service/
COPY packages/shared/package*.json ./packages/shared/
COPY tsconfig.json ./
COPY apps/payment-service/tsconfig.json ./apps/payment-service/
RUN npm ci --workspace=apps/payment-service --workspace=packages/shared
COPY packages/shared ./packages/shared
COPY apps/payment-service/src ./apps/payment-service/src
COPY apps/payment-service/migrations ./apps/payment-service/migrations
RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/payment-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/payment-service/package*.json ./apps/payment-service/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/payment-service --workspace=packages/shared --omit=dev
COPY --from=builder /app/apps/payment-service/dist ./apps/payment-service/dist
COPY --from=builder /app/apps/payment-service/migrations ./apps/payment-service/migrations
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3003/health || exit 1
CMD ["node", "apps/payment-service/dist/index.js"]
