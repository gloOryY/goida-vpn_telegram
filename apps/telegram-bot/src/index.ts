import 'dotenv/config';
import { createBot } from './bot';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('[Bot] TELEGRAM_BOT_TOKEN is not set. Exiting.');
  process.exit(1);
}

const bot = createBot(token);

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

bot.launch().then(() => {
  console.info('[Bot] Started successfully (long polling)');
}).catch((err) => {
  console.error('[Bot] Failed to launch:', err);
  process.exit(1);
});
