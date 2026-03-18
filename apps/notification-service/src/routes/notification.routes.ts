import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { createNotification } from '../repositories/notification.repository';
import {
  buildResponse,
  buildErrorResponse,
  buildError,
  ErrorCodes,
  HttpStatus,
} from '@goida-vpn/shared';

/**
 * Внутренние маршруты — вызываются другими микросервисами, не публичные.
 * Защищены shared-секретом (INTERNAL_SECRET) вместо JWT.
 */
export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  const internalAuthHook = async (request: any, reply: any) => {
    const secret = request.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_SECRET) {
      return reply.status(HttpStatus.FORBIDDEN).send(
        buildErrorResponse([buildError(ErrorCodes.FORBIDDEN, 'Forbidden')]),
      );
    }
  };

  // ─── POST /internal/notifications ────────────────────────────
  app.post(
    '/internal/notifications',
    {
      preHandler: [internalAuthHook],
      schema: {
        tags: ['Internal'],
        summary: 'Создать уведомление (вызов из других сервисов)',
        body: Type.Object({
          user_id:     Type.String({ format: 'uuid' }),
          telegram_id: Type.Integer(),
          type: Type.Union([
            Type.Literal('payment_success'),
            Type.Literal('payment_failed'),
            Type.Literal('subscription_activated'),
            Type.Literal('subscription_expiring'),
            Type.Literal('subscription_expired'),
            Type.Literal('vpn_key_ready'),
          ]),
          payload: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        }),
      },
    },
    async (request, reply) => {
      const body = request.body as {
        user_id: string;
        telegram_id: number;
        type: any;
        payload?: Record<string, unknown>;
      };

      const notification = await createNotification(
        body.user_id,
        body.telegram_id,
        body.type,
        body.payload ?? {},
      );

      return reply.status(HttpStatus.CREATED).send(buildResponse(notification));
    },
  );
}
