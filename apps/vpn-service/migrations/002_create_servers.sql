-- VPN Service: таблица серверов
-- Версия: 002

CREATE TYPE server_protocol AS ENUM ('outline', 'wireguard');
CREATE TYPE server_status   AS ENUM ('active', 'maintenance', 'disabled');

CREATE TABLE IF NOT EXISTS servers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  country    VARCHAR(100) NOT NULL,
  city       VARCHAR(100),
  host       VARCHAR(255) NOT NULL,
  protocol   server_protocol NOT NULL DEFAULT 'outline',
  status     server_status   NOT NULL DEFAULT 'active',
  -- Для Outline: API URL и secret
  api_url    TEXT,
  api_cert   TEXT,
  -- Для WireGuard: публичный ключ и endpoint
  public_key TEXT,
  endpoint   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servers_status   ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_protocol ON servers(protocol);

CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
