import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  createInvoice,
  findInvoiceById,
  findInvoicesByUserId,
  findInvoiceByProviderInvoiceId,
  markInvoicePaid,
  markInvoiceFailed,
} from '../repositories/invoice.repository';
import { saveWebhookEvent, markWebhookProcessed } from '../repositories/webhook.repository';
import {
  buildResponse,
  buildListResponse,
  buildPaginationMeta,
  buildErrorResponse,
  buildError,
  ErrorCodes,
  HttpStatus,
} from '@goida-vpn/shared';

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  // ─── Protected routes (JWT) ───────────────────────────────────
  const jwtHook = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(HttpStatus.UNAUTHORIZED).send(
        buildErrorResponse([buildError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')]),
      );
    }
  };

  // ─── POST /api/v1/invoices ────────────────────────────────────
  app.post(
    '/invoices',
    {
      preHandler: [jwtHook],
      schema: {
        tags: ['Invoices'],
        summary: 'Создать счёт на оплату',
        body: Type.Object({
          subscription_id: Type.String({ format: 'uuid' }),
          provider:        Type.Union([
            Type.Literal('telegram_stars'),
            Type.Literal('yookassa'),
            Type.Literal('crypto'),
          ]),
          amount_kopeks:   Type.Integer({ minimum: 1 }),
          currency:        Type.Optional(Type.String({ default: 'RUB' })),
        }),
      },
    },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const body = request.body as {
        subscription_id: string;
        provider: 'telegram_stars' | 'yookassa' | 'crypto';
        amount_kopeks: number;
        currency?: string;
      };

      const invoice = await createInvoice({
        user_id: payload.sub,
        subscription_id: body.subscription_id,
        provider: body.provider,
        amount_kopeks: body.amount_kopeks,
        currency: body.currency,
      });

      return reply.status(HttpStatus.CREATED).send(buildResponse(invoice));
    },
  );

  // ─── GET /api/v1/invoices ─────────────────────────────────────
  app.get(
    '/invoices',
    {
      preHandler: [jwtHook],
      schema: { tags: ['Invoices'], summary: 'Мои счета' },
    },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const invoices = await findInvoicesByUserId(payload.sub);
      const meta = buildPaginationMeta(invoices.length, 1, invoices.length || 1);
      return reply.status(HttpStatus.OK).send(buildListResponse(invoices, meta));
    },
  );

  // ─── GET /api/v1/invoices/:id ─────────────────────────────────
  app.get(
    '/invoices/:id',
    {
      preHandler: [jwtHook],
      schema: {
        tags: ['Invoices'],
        summary: 'Получить счёт по ID',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      },
    },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const { id } = request.params as { id: string };
      const invoice = await findInvoiceById(id);

      if (!invoice || invoice.user_id !== payload.sub) {
        return reply.status(HttpStatus.NOT_FOUND).send(
          buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'Invoice not found')]),
        );
      }

      return reply.status(HttpStatus.OK).send(buildResponse(invoice));
    },
  );

  // ─── POST /api/v1/webhooks/telegram ──────────────────────────
  // Принимает уведомления об успешной оплате через Telegram Stars
  app.post(
    '/webhooks/telegram',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Webhook от Telegram (successful_payment)',
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;

      // Логируем входящее событие
      const event = await saveWebhookEvent('telegram', 'successful_payment', body);

      try {
        // Telegram присылает update с successful_payment внутри message
        const message = (body as any)?.message;
        const payment = message?.successful_payment;

        if (!payment) {
          await markWebhookProcessed(event.id, 'No successful_payment in payload');
          return reply.status(HttpStatus.OK).send({ ok: true });
        }

        const invoicePayload: string = payment.invoice_payload ?? '';
        const telegramChargeId: string = payment.telegram_payment_charge_id ?? '';

        // invoice_payload содержит наш invoice_id
        const invoice = await findInvoiceById(invoicePayload);

        if (!invoice) {
          await markWebhookProcessed(event.id, `Invoice ${invoicePayload} not found`);
          return reply.status(HttpStatus.OK).send({ ok: true });
        }

        await markInvoicePaid(invoice.id, telegramChargeId, telegramChargeId);
        await markWebhookProcessed(event.id);

        app.log.info(`[Payment] Invoice ${invoice.id} marked as paid`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        await markWebhookProcessed(event.id, msg);
        app.log.error(`[Payment] Webhook processing error: ${msg}`);
      }

      // Telegram всегда ожидает 200 OK
      return reply.status(HttpStatus.OK).send({ ok: true });
    },
  );

  // ─── POST /api/v1/webhooks/yookassa ──────────────────────────
  app.post(
    '/webhooks/yookassa',
    { schema: { tags: ['Webhooks'], summary: 'Webhook от ЮКасса' } },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const event = await saveWebhookEvent('yookassa', (body as any)?.event ?? 'unknown', body);

      try {
        const eventType: string = (body as any)?.event ?? '';
        const paymentObj = (body as any)?.object;

        if (eventType === 'payment.succeeded' && paymentObj) {
          const providerInvoiceId: string = paymentObj.id;
          const invoice = await findInvoiceByProviderInvoiceId(providerInvoiceId);

          if (invoice) {
            await markInvoicePaid(invoice.id, providerInvoiceId);
            app.log.info(`[Payment] YooKassa: Invoice ${invoice.id} paid`);
          }
        } else if (eventType === 'payment.canceled' && paymentObj) {
          const providerInvoiceId: string = paymentObj.id;
          const invoice = await findInvoiceByProviderInvoiceId(providerInvoiceId);
          if (invoice) await markInvoiceFailed(invoice.id);
        }

        await markWebhookProcessed(event.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        await markWebhookProcessed(event.id, msg);
      }

      return reply.status(HttpStatus.OK).send({ ok: true });
    },
  );
}
