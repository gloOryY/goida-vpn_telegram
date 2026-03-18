-- Notification Service: лог отправленных уведомлений
-- Версия: 001

CREATE TYPE notification_type AS ENUM (
  'payment_success',
  'payment_failed',
  'subscription_activated',
  'subscription_expiring',
  'subscription_expired',
  'vpn_key_ready'
);

CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  telegram_id   BIGINT NOT NULL,
  type          notification_type NOT NULL,
  status        notification_status NOT NULL DEFAULT 'pending',
  payload       JSONB NOT NULL DEFAULT '{}',
  -- Telegram message_id после успешной отправки
  telegram_message_id BIGINT,
  error         TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status    ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type      ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
