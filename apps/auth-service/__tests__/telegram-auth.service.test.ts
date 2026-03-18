import crypto from 'crypto';
import { verifyTelegramAuth } from '../src/services/telegram-auth.service';
import type { TelegramAuthData } from '@goida-vpn/shared';

const BOT_TOKEN = 'test_bot_token_123456789';

function buildValidAuthData(overrides: Partial<TelegramAuthData> = {}): TelegramAuthData {
  const authDate = Math.floor(Date.now() / 1000); // сейчас, всегда свежий

  const data: Omit<TelegramAuthData, 'hash'> = {
    id: 123456789,
    first_name: 'Ivan',
    last_name: 'Petrov',
    username: 'ivanpetrov',
    auth_date: authDate,
    ...overrides,
  };

  // Строим правильный hash
  const checkString = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return { ...data, hash } as TelegramAuthData;
}

describe('verifyTelegramAuth', () => {
  it('возвращает true для валидных данных', () => {
    const data = buildValidAuthData();
    expect(verifyTelegramAuth(data, BOT_TOKEN)).toBe(true);
  });

  it('возвращает false при неверном hash', () => {
    const data = buildValidAuthData();
    const tampered = { ...data, hash: 'deadbeefdeadbeefdeadbeefdeadbeef' };
    expect(verifyTelegramAuth(tampered, BOT_TOKEN)).toBe(false);
  });

  it('возвращает false при истёкшем auth_date (>24 часов)', () => {
    const expiredDate = Math.floor(Date.now() / 1000) - 90000; // 25 часов назад
    const data = buildValidAuthData({ auth_date: expiredDate });
    // hash пересчитан с истёкшим auth_date — он корректный, но данные просрочены
    expect(verifyTelegramAuth(data, BOT_TOKEN)).toBe(false);
  });

  it('возвращает false при неверном bot token', () => {
    const data = buildValidAuthData();
    expect(verifyTelegramAuth(data, 'wrong_token')).toBe(false);
  });

  it('возвращает false при подмене поля id', () => {
    const data = buildValidAuthData();
    const tampered = { ...data, id: 999999999 }; // hash не соответствует
    expect(verifyTelegramAuth(tampered, BOT_TOKEN)).toBe(false);
  });

  it('корректно работает без опциональных полей', () => {
    const authDate = Math.floor(Date.now() / 1000);
    const minimal: Omit<TelegramAuthData, 'hash'> = {
      id: 42,
      first_name: 'Test',
      auth_date: authDate,
    };
    const checkString = Object.entries(minimal)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    expect(verifyTelegramAuth({ ...minimal, hash }, BOT_TOKEN)).toBe(true);
  });
});
