import 'dotenv/config';
import { buildApp } from './app';
import { runMigrations } from './db/client';

const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    await runMigrations();
    console.info('[VPN] Migrations applied');
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    console.info(`[VPN] Service running on ${HOST}:${PORT}`);
  } catch (err) {
    console.error('[VPN] Failed to start:', err);
    process.exit(1);
  }
}

main();
