-- Payment Service: счета на оплату
-- Версия: 001

CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'failed', 'expired', 'refunded');
CREATE TYPE payment_provider AS ENUM ('telegram_stars', 'yookassa', 'crypto');

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  subscription_id UUID NOT NULL,          -- ссылка на vpn-service
  provider        payment_provider NOT NULL DEFAULT 'telegram_stars',
  amount_kopeks   INTEGER NOT NULL CHECK (amount_kopeks > 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'RUB',
  status          invoice_status NOT NULL DEFAULT 'pending',
  -- Данные от провайдера
  provider_invoice_id  VARCHAR(255),
  provider_payment_id  VARCHAR(255),
  -- Telegram Stars payload
  telegram_charge_id   VARCHAR(255),
  -- Срок действия счёта
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id         ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status          ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_provider_invoice_id ON invoices(provider_invoice_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
