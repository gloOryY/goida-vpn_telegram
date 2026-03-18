import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';

// Мокаем @fastify/reply-from чтобы не проксировать реально
jest.mock('@fastify/reply-from', () => {
  return async function replyFromMock(app: any) {
    app.decorateReply('from', function (this: any, url: string) {
      return this.send({ proxied_to: url });
    });
  };
});

describe('API Gateway', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_gateway';
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('возвращает 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'ok', service: 'api-gateway' });
    });
  });

  describe('Protected routes', () => {
    it('GET /api/v1/profile — 401 без токена', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/profile' });
      expect(res.statusCode).toBe(401);
      expect(res.json().errors[0].code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/profile — 200 с валидным токеном', async () => {
      const token = app.jwt.sign({ sub: 'user-uuid-1', telegram_id: 123 });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });
      // Gateway проксирует запрос (мок возвращает proxied_to)
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Public routes', () => {
    it('POST /api/v1/auth/telegram — не требует JWT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/telegram',
        payload: {},
      });
      // Прокси срабатывает (без JWT), статус не 401
      expect(res.statusCode).not.toBe(401);
    });
  });

  describe('404', () => {
    it('неизвестный маршрут — 404', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v999/unknown' });
      expect(res.statusCode).toBe(404);
      expect(res.json().errors[0].code).toBe('NOT_FOUND');
    });
  });
});
