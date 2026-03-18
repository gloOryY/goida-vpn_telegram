import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { findAllActivePlans, findPlanById } from '../repositories/plan.repository';
import {
  findSubscriptionsByUserId,
  findActiveSubscription,
  createSubscription,
  findVpnKeyBySubscription,
} from '../repositories/subscription.repository';
import {
  buildResponse,
  buildListResponse,
  buildPaginationMeta,
  buildErrorResponse,
  buildError,
  ErrorCodes,
  HttpStatus,
} from '@goida-vpn/shared';

export async function vpnRoutes(app: FastifyInstance): Promise<void> {
  // JWT-авторизация для всех маршрутов
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(HttpStatus.UNAUTHORIZED).send(
        buildErrorResponse([buildError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')]),
      );
    }
  });

  // ─── GET /api/v1/plans ───────────────────────────────────────
  app.get(
    '/plans',
    {
      schema: {
        tags: ['Plans'],
        summary: 'Список активных тарифов',
        querystring: Type.Object({
          page:     Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
          per_page: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
        }),
      },
    },
    async (request, reply) => {
      const { page = 1, per_page = 20 } = request.query as { page?: number; per_page?: number };
      const plans = await findAllActivePlans();

      // Пагинация на уровне приложения (планов обычно мало)
      const total = plans.length;
      const start = (page - 1) * per_page;
      const paginated = plans.slice(start, start + per_page);

      return reply
        .status(HttpStatus.OK)
        .send(buildListResponse(paginated, buildPaginationMeta(total, page, per_page)));
    },
  );

  // ─── GET /api/v1/plans/:id ───────────────────────────────────
  app.get(
    '/plans/:id',
    {
      schema: {
        tags: ['Plans'],
        summary: 'Получить тариф по ID',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const plan = await findPlanById(id);

      if (!plan) {
        return reply
          .status(HttpStatus.NOT_FOUND)
          .send(buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'Plan not found')]));
      }

      return reply.status(HttpStatus.OK).send(buildResponse(plan));
    },
  );

  // ─── GET /api/v1/subscriptions ───────────────────────────────
  app.get(
    '/subscriptions',
    { schema: { tags: ['Subscriptions'], summary: 'Мои подписки' } },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const subscriptions = await findSubscriptionsByUserId(payload.sub);
      const meta = buildPaginationMeta(subscriptions.length, 1, subscriptions.length || 1);
      return reply.status(HttpStatus.OK).send(buildListResponse(subscriptions, meta));
    },
  );

  // ─── POST /api/v1/subscriptions ──────────────────────────────
  app.post(
    '/subscriptions',
    {
      schema: {
        tags: ['Subscriptions'],
        summary: 'Создать подписку (pending — ожидает оплаты)',
        body: Type.Object({ plan_id: Type.String({ format: 'uuid' }) }),
      },
    },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const { plan_id } = request.body as { plan_id: string };

      const plan = await findPlanById(plan_id);
      if (!plan || !plan.is_active) {
        return reply
          .status(HttpStatus.NOT_FOUND)
          .send(buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'Plan not found or inactive')]));
      }

      const subscription = await createSubscription(payload.sub, plan_id);
      return reply.status(HttpStatus.CREATED).send(buildResponse(subscription));
    },
  );

  // ─── GET /api/v1/subscriptions/active ────────────────────────
  app.get(
    '/subscriptions/active',
    { schema: { tags: ['Subscriptions'], summary: 'Активная подписка' } },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const subscription = await findActiveSubscription(payload.sub);

      if (!subscription) {
        return reply
          .status(HttpStatus.NOT_FOUND)
          .send(buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'No active subscription')]));
      }

      return reply.status(HttpStatus.OK).send(buildResponse(subscription));
    },
  );

  // ─── GET /api/v1/subscriptions/:id/key ───────────────────────
  app.get(
    '/subscriptions/:id/key',
    {
      schema: {
        tags: ['Subscriptions'],
        summary: 'Получить VPN-ключ для подписки',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const key = await findVpnKeyBySubscription(id);

      if (!key) {
        return reply
          .status(HttpStatus.NOT_FOUND)
          .send(buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'VPN key not found')]));
      }

      return reply.status(HttpStatus.OK).send(buildResponse(key));
    },
  );
}
