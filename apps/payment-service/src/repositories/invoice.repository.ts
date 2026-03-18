import sql from '../db/client';

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
export type PaymentProvider = 'telegram_stars' | 'yookassa' | 'crypto';

export interface Invoice {
  id: string;
  user_id: string;
  subscription_id: string;
  provider: PaymentProvider;
  amount_kopeks: number;
  currency: string;
  status: InvoiceStatus;
  provider_invoice_id: string | null;
  provider_payment_id: string | null;
  telegram_charge_id: string | null;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceDto {
  user_id: string;
  subscription_id: string;
  provider: PaymentProvider;
  amount_kopeks: number;
  currency?: string;
}

const SELECT_FIELDS = sql`
  id, user_id, subscription_id, provider, amount_kopeks, currency, status,
  provider_invoice_id, provider_payment_id, telegram_charge_id,
  expires_at::text, paid_at::text, created_at::text, updated_at::text
`;

export async function createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
  const [invoice] = await sql<Invoice[]>`
    INSERT INTO invoices (user_id, subscription_id, provider, amount_kopeks, currency)
    VALUES (${dto.user_id}, ${dto.subscription_id}, ${dto.provider},
            ${dto.amount_kopeks}, ${dto.currency ?? 'RUB'})
    RETURNING ${SELECT_FIELDS}
  `;
  return invoice;
}

export async function findInvoiceById(id: string): Promise<Invoice | null> {
  const [invoice] = await sql<Invoice[]>`
    SELECT ${SELECT_FIELDS} FROM invoices WHERE id = ${id}
  `;
  return invoice ?? null;
}

export async function findInvoicesByUserId(userId: string): Promise<Invoice[]> {
  return sql<Invoice[]>`
    SELECT ${SELECT_FIELDS} FROM invoices
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

export async function findInvoiceByProviderInvoiceId(
  providerInvoiceId: string,
): Promise<Invoice | null> {
  const [invoice] = await sql<Invoice[]>`
    SELECT ${SELECT_FIELDS} FROM invoices
    WHERE provider_invoice_id = ${providerInvoiceId}
  `;
  return invoice ?? null;
}

export async function markInvoicePaid(
  id: string,
  providerPaymentId: string,
  telegramChargeId?: string,
): Promise<Invoice | null> {
  const [invoice] = await sql<Invoice[]>`
    UPDATE invoices SET
      status               = 'paid',
      provider_payment_id  = ${providerPaymentId},
      telegram_charge_id   = ${telegramChargeId ?? null},
      paid_at              = NOW()
    WHERE id = ${id} AND status = 'pending'
    RETURNING ${SELECT_FIELDS}
  `;
  return invoice ?? null;
}

export async function markInvoiceFailed(id: string): Promise<Invoice | null> {
  const [invoice] = await sql<Invoice[]>`
    UPDATE invoices SET status = 'failed'
    WHERE id = ${id} AND status = 'pending'
    RETURNING ${SELECT_FIELDS}
  `;
  return invoice ?? null;
}

export async function expireStaleInvoices(): Promise<number> {
  const result = await sql`
    UPDATE invoices SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW()
  `;
  return result.count;
}
