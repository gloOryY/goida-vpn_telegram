import crypto from 'crypto';

export interface GeneratedKey {
  access_key: string;
  outline_key_id?: string;
}

/**
 * Генерирует VPN-ключ.
 * В реальной реализации делает запрос к Outline Server API.
 * Сейчас возвращает реалистичный stub для разработки.
 */
export async function generateOutlineKey(
  serverApiUrl: string,
  _serverCert: string,
): Promise<GeneratedKey> {
  // TODO (Этап 2): реальный вызов Outline Management API
  // POST {serverApiUrl}/access-keys
  // Возвращает { id, accessUrl }

  // Stub: генерируем валидный по формату ключ
  const keyId = Math.floor(Math.random() * 10000).toString();
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  const host = new URL(serverApiUrl).hostname;

  return {
    access_key: `ss://2022-blake3-aes-256-gcm:${randomBytes}@${host}:12345/?outline=1`,
    outline_key_id: keyId,
  };
}

/**
 * Генерирует WireGuard конфигурацию (stub для Этапа 2).
 */
export async function generateWireguardConfig(
  serverHost: string,
  serverPublicKey: string,
): Promise<GeneratedKey> {
  const privateKey = crypto.randomBytes(32).toString('base64');
  const psk = crypto.randomBytes(32).toString('base64');

  const config = [
    '[Interface]',
    `PrivateKey = ${privateKey}`,
    'Address = 10.0.0.2/32',
    'DNS = 1.1.1.1',
    '',
    '[Peer]',
    `PublicKey = ${serverPublicKey}`,
    `PresharedKey = ${psk}`,
    `Endpoint = ${serverHost}:51820`,
    'AllowedIPs = 0.0.0.0/0, ::/0',
    'PersistentKeepalive = 25',
  ].join('\n');

  return { access_key: config };
}
