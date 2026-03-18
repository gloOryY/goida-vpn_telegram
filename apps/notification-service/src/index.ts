import 'dotenv/config';
import Fastify from 'fastify';
import { notificationRoutes } from './routes/notification.routes';
import { processNotificationQueue } from './services/sender.service';
import { runMigrations } from './db/client';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

  app.get('/health', async () => ({ status: 'ok', service: 'notification-service' }));

  await app.register(notificationRoutes);

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

const PORT = Number(process.env.PORT) || 3004;
const HOST = process.env.HOST || '0.0.0.0';
const QUEUE_INTERVAL_MS = Number(process.env.QUEUE_INTERVAL_MS) || 10_000; // 10 сек

async function main() {
  try {
    await runMigrations();
    console.info('[Notification] Migrations applied');

    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    console.info(`[Notification] Service running on ${HOST}:${PORT}`);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('[Notification] TELEGRAM_BOT_TOKEN not set — queue processor disabled');
      return;
    }

    // Запускаем обработчик очереди
    setInterval(() => processNotificationQueue(botToken), QUEUE_INTERVAL_MS);
    console.info(`[Notification] Queue processor started (interval: ${QUEUE_INTERVAL_MS}ms)`);
  } catch (err) {
    console.error('[Notification] Failed to start:', err);
    process.exit(1);
  }
}

main();
