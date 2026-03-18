import 'dotenv/config';
import { buildApp } from './app';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    console.info(`[Gateway] Running on ${HOST}:${PORT}`);
  } catch (err) {
    console.error('[Gateway] Failed to start:', err);
    process.exit(1);
  }
}

main();
