import crypto from 'crypto';
import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';
import type { TelegramAuthData } from '@goida-vpn/shared';

// Мокаем БД — в unit-тестах не подключаемся к реальной Postgres
jest.mock('../src/db/client', () => ({
  __esModule: true,
  default: jest.fn(),
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/repositories/user.repository', () => ({
  upsertUser: jest.fn().mockResolvedValue({
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    telegram_id: 123456789,
    first_name: 'Ivan',
    last_name: 'Petrov',
    username: 'ivanpetrov',
    photo_url: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }),
  findById: jest.fn().mockResolvedValue({
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    telegram_id: 123456789,
    first_name: 'Ivan',
    last_name: 'Petrov',
    username: 'ivanpetrov',
    photo_url: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }),
  updateUser: jest.fn().mockResolvedValue({
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    telegram_id: 123456789,
    first_name: 'Updated',
    last_name: null,
    username: 'ivanpetrov',
    photo_url: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  }),
}));

const BOT_TOKEN = 'test_bot_token_123456789';

function buildValidTelegramAuth(): TelegramAuthData {
  const authDate = Math.floor(Date.now() / 1000);
  const fields = { id: 123456789, first_name: 'Ivan', username: 'ivanpetrov', auth_date: authDate };

  const checkString = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return { ...fields, hash };
}

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('возвращает 200 OK', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'ok' });
    });
  });

  describe('POST /api/v1/auth/telegram', () => {
    it('возвращает access_token при валидных данных', async () => {
      const body = buildValidTelegramAuth();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/telegram',
        payload: body,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data).toHaveProperty('access_token');
      expect(json.data.token_type).toBe('Bearer');
    });

    it('возвращает 401 при неверном hash', async () => {
      const body = { ...buildValidTelegramAuth(), hash: 'invalid_hash' };
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/telegram',
        payload: body,
      });

      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.errors[0].code).toBe('TELEGRAM_AUTH_INVALID');
    });

    it('возвращает 400 при отсутствующих полях', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/telegram',
        payload: { id: 123 }, // нет hash, auth_date и т.д.
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/profile', () => {
    it('возвращает 401 без токена', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/profile' });
      expect(res.statusCode).toBe(401);
    });

    it('возвращает профиль с валидным токеном', async () => {
      const token = app.jwt.sign({ sub: 'a1b2c3d4-0000-0000-0000-000000000001', telegram_id: 123456789 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data).toHaveProperty('telegram_id', 123456789);
    });
  });
});
