import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { verifyTelegramAuth } from '../services/telegram-auth.service';
import { upsertUser } from '../repositories/user.repository';
import { buildResponse, buildErrorResponse, buildError, ErrorCodes, HttpStatus } from '@goida-vpn/shared';

const TelegramAuthBody = Type.Object({
  id: Type.Number(),
  first_name: Type.String(),
  last_name: Type.Optional(Type.String()),
  username: Type.Optional(Type.String()),
  photo_url: Type.Optional(Type.String()),
  auth_date: Type.Number(),
  hash: Type.String(),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/telegram
   * Аутентификация через Telegram Login Widget / initData
   */
  app.post(
    '/telegram',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Аутентификация через Telegram',
        body: TelegramAuthBody,
        response: {
          200: Type.Object({
            data: Type.Object({
              access_token: Type.String(),
              token_type: Type.Literal('Bearer'),
              expires_in: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
          buildErrorResponse([buildError(ErrorCodes.INTERNAL_ERROR, 'Bot token not configured')]),
        );
      }

      const authData = request.body as typeof TelegramAuthBody.static;
      const isValid = verifyTelegramAuth(authData, botToken);

      if (!isValid) {
        return reply.status(HttpStatus.UNAUTHORIZED).send(
          buildErrorResponse([
            buildError(
              ErrorCodes.TELEGRAM_AUTH_INVALID,
              'Telegram auth data is invalid or expired',
              'Данные авторизации Telegram недействительны или устарели',
            ),
          ]),
        );
      }

      // Upsert пользователя в БД
      const user = await upsertUser({
        telegram_id: authData.id,
        first_name: authData.first_name,
        last_name: authData.last_name,
        username: authData.username,
        photo_url: authData.photo_url,
      });

      // Выдаём JWT
      const token = app.jwt.sign(
        { sub: user.id, telegram_id: user.telegram_id },
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      );

      return reply.status(HttpStatus.OK).send(
        buildResponse({
          access_token: token,
          token_type: 'Bearer' as const,
          expires_in: 7 * 24 * 60 * 60,
        }),
      );
    },
  );
}
