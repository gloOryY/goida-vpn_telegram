-- VPN Service: таблица тарифных планов
-- Версия: 001

CREATE TABLE IF NOT EXISTS plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  price_kopeks INTEGER NOT NULL CHECK (price_kopeks >= 0),  -- цена в копейках (целые числа по Ensi Guide)
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed: стартовые тарифы
INSERT INTO plans (name, description, price_kopeks, duration_days) VALUES
  ('Месяц',    '1 месяц VPN-доступа',  29900,  30),
  ('Квартал',  '3 месяца VPN-доступа', 79900,  90),
  ('Год',      '12 месяцев VPN-доступа',249900, 365)
ON CONFLICT DO NOTHING;
