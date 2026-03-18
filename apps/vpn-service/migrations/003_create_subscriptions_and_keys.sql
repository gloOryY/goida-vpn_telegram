-- VPN Service: подписки и VPN-ключи
-- Версия: 003

CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');

CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,                    -- ссылка на users в auth-service
  plan_id     UUID NOT NULL REFERENCES plans(id),
  server_id   UUID REFERENCES servers(id),
  status      subscription_status NOT NULL DEFAULT 'pending',
  starts_at   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id   ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status    ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VPN-ключи: один ключ на подписку
CREATE TABLE IF NOT EXISTS vpn_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  server_id       UUID NOT NULL REFERENCES servers(id),
  -- Для Outline: числовой ID ключа на сервере
  outline_key_id  VARCHAR(64),
  -- Универсальная строка подключения (access key / config)
  access_key      TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_vpn_keys_subscription_id ON vpn_keys(subscription_id);
CREATE INDEX IF NOT EXISTS idx_vpn_keys_is_active        ON vpn_keys(is_active);

CREATE TRIGGER update_vpn_keys_updated_at
  BEFORE UPDATE ON vpn_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
