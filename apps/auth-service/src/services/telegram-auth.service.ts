import crypto from 'crypto';
import type { TelegramAuthData } from '@goida-vpn/shared';

const AUTH_MAX_AGE_SECONDS = 86400; // 24 часа

/**
 * Проверяет подпись Telegram Login Widget согласно официальной документации.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...authFields } = data;

  // Строим строку для проверки: поля отсортированы по алфавиту, через \n
  const checkString = Object.entries(authFields)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Секретный ключ = SHA-256 от токена бота
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (expectedHash !== hash) return false;

  // Проверяем свежесть данных
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - data.auth_date > AUTH_MAX_AGE_SECONDS) return false;

  return true;
}

/**
 * Проверяет данные авторизации от Telegram Bot (не виджет).
 * Используется для верификации запросов от бота через initData.
 */
export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;

  params.delete('hash');

  const checkString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return expectedHash === hash;
}
