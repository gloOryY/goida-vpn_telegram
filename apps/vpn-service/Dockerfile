FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/vpn-service/package*.json ./apps/vpn-service/
COPY packages/shared/package*.json ./packages/shared/
COPY tsconfig.json ./
COPY apps/vpn-service/tsconfig.json ./apps/vpn-service/
RUN npm ci --workspace=apps/vpn-service --workspace=packages/shared
COPY packages/shared ./packages/shared
COPY apps/vpn-service/src ./apps/vpn-service/src
COPY apps/vpn-service/migrations ./apps/vpn-service/migrations
RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/vpn-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/vpn-service/package*.json ./apps/vpn-service/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/vpn-service --workspace=packages/shared --omit=dev
COPY --from=builder /app/apps/vpn-service/dist ./apps/vpn-service/dist
COPY --from=builder /app/apps/vpn-service/migrations ./apps/vpn-service/migrations
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1
CMD ["node", "apps/vpn-service/dist/index.js"]
