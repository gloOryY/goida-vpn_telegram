import { Telegraf, session, Context } from 'telegraf';
import type { BotSession } from './types';
import { apiClient } from './api-client';

export interface BotContext extends Context {
  session: BotSession;
}

export function createBot(token: string): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(token);

  // ─── Session middleware ──────────────────────────────────────
  bot.use(session({ defaultSession: (): BotSession => ({}) }));

  // ─── /start ──────────────────────────────────────────────────
  bot.start(async (ctx) => {
    const user = ctx.from;
    const firstName = user?.first_name ?? 'друг';

    await ctx.reply(
      `☦ Добро пожаловать в GOIDA VPN, ${firstName}!\n\n` +
        `Здесь ты можешь купить быстрый и надёжный VPN.\n\n` +
        `📋 Доступные команды:\n` +
        `/help — список команд\n` +
        `/profile — мой профиль\n` +
        `/buy — купить подписку (скоро)\n` +
        `/mykey — мои ключи (скоро)\n`,
      { parse_mode: 'Markdown' },
    );
  });

  // ─── /help ───────────────────────────────────────────────────
  bot.help(async (ctx) => {
    await ctx.reply(
      `☦ *GOIDA VPN* — помощь\n\n` +
        `*Основные команды:*\n` +
        `/start — главное меню\n` +
        `/help — эта справка\n` +
        `/profile — посмотреть профиль\n\n` +
        `*Подписки (появятся в следующем обновлении):*\n` +
        `/buy — выбрать и купить тариф\n` +
        `/mykey — ваши VPN-ключи и конфигурации\n\n` +
        `По вопросам: @goida_support`,
      { parse_mode: 'Markdown' },
    );
  });

  // ─── /profile ────────────────────────────────────────────────
  bot.command('profile', async (ctx) => {
    const { session: sess } = ctx;

    if (!sess.accessToken) {
      await ctx.reply(
        '⚠️ Вы не авторизованы. Используйте /start для начала работы.',
      );
      return;
    }

    try {
      apiClient.setToken(sess.accessToken);
      const profile = await apiClient.getProfile();

      const lines = [
        `👤 *Ваш профиль*\n`,
        `🆔 ID: \`${profile.telegram_id}\``,
        `👤 Имя: ${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`,
        profile.username ? `🔗 Username: @${profile.username}` : null,
        `\n📅 Зарегистрирован: ${new Date(profile.created_at).toLocaleDateString('ru-RU')}`,
      ].filter(Boolean).join('\n');

      await ctx.reply(lines, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply('❌ Не удалось загрузить профиль. Попробуйте позже.');
    }
  });

  // ─── /buy и /mykey — заглушки (Этап 2) ─────────────────────
  bot.command('buy', async (ctx) => {
    await ctx.reply('🚧 Покупка подписок будет доступна совсем скоро!\n\nСледите за обновлениями.');
  });

  bot.command('mykey', async (ctx) => {
    await ctx.reply('🚧 Просмотр VPN-ключей будет доступен совсем скоро!');
  });

  // ─── Обработка неизвестных команд ────────────────────────────
  bot.on('text', async (ctx) => {
    await ctx.reply(
      'Не понимаю эту команду. Введите /help чтобы посмотреть список доступных команд.',
    );
  });

  // ─── Глобальный обработчик ошибок ────────────────────────────
  bot.catch((err, ctx) => {
    console.error(`[Bot] Error for ${ctx.updateType}:`, err);
  });

  return bot;
}
