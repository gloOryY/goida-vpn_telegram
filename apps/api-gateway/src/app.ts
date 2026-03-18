import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { buildErrorResponse, buildError, ErrorCodes, HttpStatus } from '@goida-vpn/shared';

const AUTH_SERVICE_URL        = process.env.AUTH_SERVICE_URL        || 'http://localhost:3001';
const VPN_SERVICE_URL         = process.env.VPN_SERVICE_URL         || 'http://localhost:3002';
const PAYMENT_SERVICE_URL     = process.env.PAYMENT_SERVICE_URL     || 'http://localhost:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

  // ─── Plugins ──────────────────────────────────────────────────
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      errors: [buildError(ErrorCodes.RATE_LIMIT_EXCEEDED, 'Too many requests', 'Превышен лимит запросов')],
    }),
  });

  // Регистрируем отдельный replyFrom для каждого сервиса через именованные плагины
  // Используем подход с ручным fetch для гибкого проксирования
  app.decorate('proxyTo', async function (
    this: any,
    targetBase: string,
    request: any,
    reply: any,
  ) {
    const url = `${targetBase}${request.url}`;
    try {
      const headers: Record<string, string> = {
        'content-type': request.headers['content-type'] || 'application/json',
      };
      if (request.headers['authorization']) {
        headers['authorization'] = request.headers['authorization'];
      }

      const res = await fetch(url, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body),
      });

      const data = await res.json();
      return reply.status(res.status).send(data);
    } catch (err) {
      app.log.error(`[Gateway] Proxy error to ${url}: ${err}`);
      return reply.status(502).send(
        buildErrorResponse([buildError(ErrorCodes.INTERNAL_ERROR, 'Bad Gateway')]),
      );
    }
  });

  // ─── JWT декоратор ────────────────────────────────────────────
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(HttpStatus.UNAUTHORIZED).send(
        buildErrorResponse([buildError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')]),
      );
    }
  });

  // ─── Health ───────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'api-gateway',
    upstreams: {
      auth:         AUTH_SERVICE_URL,
      vpn:          VPN_SERVICE_URL,
      payment:      PAYMENT_SERVICE_URL,
      notification: NOTIFICATION_SERVICE_URL,
    },
  }));

  // ════════════════════════════════════════════════════════════════
  // PUBLIC ROUTES (без JWT)
  // ════════════════════════════════════════════════════════════════

  app.post('/api/v1/auth/telegram', (req, reply) =>
    (app as any).proxyTo(AUTH_SERVICE_URL, req, reply),
  );

  // ════════════════════════════════════════════════════════════════
  // PROTECTED ROUTES (требуют JWT)
  // ════════════════════════════════════════════════════════════════
  const auth = { preHandler: [(app as any).authenticate] };

  // ─── Auth Service ─────────────────────────────────────────────
  app.get('/api/v1/profile',   auth, (req, reply) => (app as any).proxyTo(AUTH_SERVICE_URL, req, reply));
  app.patch('/api/v1/profile', auth, (req, reply) => (app as any).proxyTo(AUTH_SERVICE_URL, req, reply));

  // ─── VPN Service ──────────────────────────────────────────────
  app.get('/api/v1/plans',                    auth, (req, reply) => (app as any).proxyTo(VPN_SERVICE_URL, req, reply));
  app.get('/api/v1/plans/:id',               auth, (req, reply) => (app as any).proxyTo(VPN_SERVICE_URL, req, reply));
  app.get('/api/v1/subscriptions',           auth, (req, reply) => (app as any).proxyTo(VPN_SERVICE_URL, req, reply));
  app.post('/api/v1/subscriptions',          auth, (req, reply) => (app as any).proxyTo(VPN_SERVICE_URL, req, reply));
  app.get('/api/v1/subscriptions/active',    auth, (req, reply) => (app as any).proxyTo(VPN_SERVICE_URL, req, reply));
  app.get('/api/v1/subscriptions/:id/key',   auth, (req, reply) => (app as any).proxyTo(VPN_SERVICE_URL, req, reply));

  // ─── Payment Service ──────────────────────────────────────────
  app.post('/api/v1/invoices',               auth, (req, reply) => (app as any).proxyTo(PAYMENT_SERVICE_URL, req, reply));
  app.get('/api/v1/invoices',                auth, (req, reply) => (app as any).proxyTo(PAYMENT_SERVICE_URL, req, reply));
  app.get('/api/v1/invoices/:id',            auth, (req, reply) => (app as any).proxyTo(PAYMENT_SERVICE_URL, req, reply));

  // Webhooks — публичные, Telegram/YooKassa не шлют JWT
  app.post('/api/v1/webhooks/telegram',  (req, reply) => (app as any).proxyTo(PAYMENT_SERVICE_URL, req, reply));
  app.post('/api/v1/webhooks/yookassa',  (req, reply) => (app as any).proxyTo(PAYMENT_SERVICE_URL, req, reply));

  // ─── Глобальный обработчик 404 ────────────────────────────────
  app.setNotFoundHandler((_req, reply) => {
    reply.status(HttpStatus.NOT_FOUND).send(
      buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'Route not found')]),
    );
  });

  // ─── Глобальный обработчик ошибок ─────────────────────────────
  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
      buildErrorResponse([buildError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')]),
    );
  });

  return app;
}
