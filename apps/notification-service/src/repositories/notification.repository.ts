import sql from '../db/client';

export type NotificationType =
  | 'payment_success'
  | 'payment_failed'
  | 'subscription_activated'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'vpn_key_ready';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface Notification {
  id: string;
  user_id: string;
  telegram_id: number;
  type: NotificationType;
  status: NotificationStatus;
  payload: Record<string, unknown>;
  telegram_message_id: number | null;
  error: string | null;
  attempts: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createNotification(
  userId: string,
  telegramId: number,
  type: NotificationType,
  payload: Record<string, unknown> = {},
): Promise<Notification> {
  const [notification] = await sql<Notification[]>`
    INSERT INTO notifications (user_id, telegram_id, type, payload)
    VALUES (${userId}, ${telegramId}, ${type}, ${JSON.stringify(payload)})
    RETURNING id, user_id, telegram_id, type, status, payload,
              telegram_message_id, error, attempts,
              sent_at::text, created_at::text, updated_at::text
  `;
  return notification;
}

export async function findPendingNotifications(limit = 50): Promise<Notification[]> {
  return sql<Notification[]>`
    SELECT id, user_id, telegram_id, type, status, payload,
           telegram_message_id, error, attempts,
           sent_at::text, created_at::text, updated_at::text
    FROM notifications
    WHERE status = 'pending' AND attempts < 3
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

export async function markNotificationSent(
  id: string,
  telegramMessageId: number,
): Promise<void> {
  await sql`
    UPDATE notifications SET
      status              = 'sent',
      telegram_message_id = ${telegramMessageId},
      sent_at             = NOW(),
      attempts            = attempts + 1
    WHERE id = ${id}
  `;
}

export async function markNotificationFailed(id: string, error: string): Promise<void> {
  await sql`
    UPDATE notifications SET
      status   = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END,
      error    = ${error},
      attempts = attempts + 1
    WHERE id = ${id}
  `;
}
