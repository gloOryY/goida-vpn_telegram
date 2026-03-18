import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { findById, updateUser } from '../repositories/user.repository';
import { buildResponse, buildErrorResponse, buildError, ErrorCodes, HttpStatus } from '@goida-vpn/shared';

const UserProfileSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  telegram_id: Type.Number(),
  first_name: Type.String(),
  last_name: Type.Union([Type.String(), Type.Null()]),
  username: Type.Union([Type.String(), Type.Null()]),
  photo_url: Type.Union([Type.String(), Type.Null()]),
  created_at: Type.String(),
  updated_at: Type.String(),
});

const UpdateProfileBody = Type.Object({
  first_name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  last_name: Type.Optional(Type.Union([Type.String({ maxLength: 255 }), Type.Null()])),
  username: Type.Optional(Type.Union([Type.String({ maxLength: 255 }), Type.Null()])),
});

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  // Все маршруты требуют JWT
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(HttpStatus.UNAUTHORIZED).send(
        buildErrorResponse([buildError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 'Требуется авторизация')]),
      );
    }
  });

  /**
   * GET /api/v1/profile
   * Получить профиль текущего пользователя
   */
  app.get(
    '/',
    {
      schema: {
        tags: ['Profile'],
        summary: 'Получить профиль текущего пользователя',
        response: {
          200: Type.Object({ data: UserProfileSchema }),
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const user = await findById(payload.sub);

      if (!user) {
        return reply.status(HttpStatus.NOT_FOUND).send(
          buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'User not found')]),
        );
      }

      return reply.status(HttpStatus.OK).send(buildResponse(user));
    },
  );

  /**
   * PATCH /api/v1/profile
   * Обновить профиль текущего пользователя
   */
  app.patch(
    '/',
    {
      schema: {
        tags: ['Profile'],
        summary: 'Обновить профиль',
        body: UpdateProfileBody,
        response: {
          200: Type.Object({ data: UserProfileSchema }),
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const dto = request.body as typeof UpdateProfileBody.static;

      const updated = await updateUser(payload.sub, dto);

      if (!updated) {
        return reply.status(HttpStatus.NOT_FOUND).send(
          buildErrorResponse([buildError(ErrorCodes.NOT_FOUND, 'User not found')]),
        );
      }

      return reply.status(HttpStatus.OK).send(buildResponse(updated));
    },
  );
}
