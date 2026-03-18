import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes';
import { profileRoutes } from './routes/profile.routes';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // JWT plugin
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

  // Routes под версионированным префиксом
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(profileRoutes, { prefix: '/api/v1/profile' });

  // Глобальный обработчик ошибок
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        errors: [
          {
            code: 'VALIDATION_ERROR',
            title: 'Validation failed',
            detail: error.message,
          },
        ],
      });
    }

    return reply.status(500).send({
      errors: [{ code: 'INTERNAL_ERROR', title: 'Internal Server Error' }],
    });
  });

  return app;
}
