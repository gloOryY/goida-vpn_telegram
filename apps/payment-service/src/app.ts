import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { paymentRoutes } from './routes/payment.routes';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
  });

  app.get('/health', async () => ({ status: 'ok', service: 'payment-service' }));

  await app.register(paymentRoutes, { prefix: '/api/v1' });

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    if (error.validation) {
      return reply.status(400).send({
        errors: [{ code: 'VALIDATION_ERROR', title: 'Validation failed', detail: error.message }],
      });
    }
    return reply.status(500).send({
      errors: [{ code: 'INTERNAL_ERROR', title: 'Internal Server Error' }],
    });
  });

  return app;
}
