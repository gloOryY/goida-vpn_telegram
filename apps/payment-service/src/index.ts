import 'dotenv/config';
import { buildApp } from './app';
import { runMigrations } from './db/client';
import { expireStaleInvoices } from './repositories/invoice.repository';

const PORT = Number(process.env.PORT) || 3003;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    await runMigrations();
    console.info('[Payment] Migrations applied');

    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    console.info(`[Payment] Service running on ${HOST}:${PORT}`);

    // Фоновая задача: протухание старых счетов каждые 5 минут
    setInterval(async () => {
      const count = await expireStaleInvoices();
      if (count > 0) console.info(`[Payment] Expired ${count} stale invoices`);
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error('[Payment] Failed to start:', err);
    process.exit(1);
  }
}

main();
