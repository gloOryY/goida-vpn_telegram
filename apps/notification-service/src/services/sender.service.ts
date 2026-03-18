import {
  findPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
} from '../repositories/notification.repository';
import { buildMessage } from './templates.service';

const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Отправляет одно Telegram-сообщение через Bot API.
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<number> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  const data = await res.json() as { ok: boolean; result?: { message_id: number }; description?: string };

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description ?? 'unknown'}`);
  }

  return data.result!.message_id;
}

/**
 * Обрабатывает очередь pending-уведомлений.
 * Запускается по расписанию (каждые N секунд).
 */
export async function processNotificationQueue(botToken: string): Promise<void> {
  const pending = await findPendingNotifications(50);

  if (pending.length === 0) return;

  console.info(`[Notifications] Processing ${pending.length} pending notifications`);

  for (const notification of pending) {
    try {
      const text = buildMessage(notification.type, notification.payload as any);
      const messageId = await sendTelegramMessage(botToken, notification.telegram_id, text);
      await markNotificationSent(notification.id, messageId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Notifications] Failed to send ${notification.id}: ${msg}`);
      await markNotificationFailed(notification.id, msg);
    }
  }
}
