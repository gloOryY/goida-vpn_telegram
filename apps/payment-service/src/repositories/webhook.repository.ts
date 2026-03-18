import sql from '../db/client';

export interface WebhookEvent {
  id: string;
  provider: string;
  event_type: string;
  payload: Record<string, unknown>;
  invoice_id: string | null;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
  created_at: string;
}

export async function saveWebhookEvent(
  provider: string,
  eventType: string,
  payload: Record<string, unknown>,
  invoiceId?: string,
): Promise<WebhookEvent> {
  const [event] = await sql<WebhookEvent[]>`
    INSERT INTO webhook_events (provider, event_type, payload, invoice_id)
    VALUES (${provider}, ${eventType}, ${JSON.stringify(payload)}, ${invoiceId ?? null})
    RETURNING id, provider, event_type, payload, invoice_id,
              processed, processed_at::text, error, created_at::text
  `;
  return event;
}

export async function markWebhookProcessed(id: string, error?: string): Promise<void> {
  await sql`
    UPDATE webhook_events SET
      processed    = true,
      processed_at = NOW(),
      error        = ${error ?? null}
    WHERE id = ${id}
  `;
}
