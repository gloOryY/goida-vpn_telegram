import type { NotificationType } from '../repositories/notification.repository';

interface TemplatePayload {
  plan_name?: string;
  expires_at?: string;
  access_key?: string;
  amount?: string;
  days_left?: number;
}

/**
 * Возвращает текст Telegram-сообщения для каждого типа уведомления.
 */
export function buildMessage(type: NotificationType, payload: TemplatePayload): string {
  switch (type) {
    case 'payment_success':
      return (
        `✅ *Оплата прошла успешно!*\n\n` +
        `Тариф: *${payload.plan_name ?? 'VPN'}*\n` +
        `Сумма: ${payload.amount ?? '—'}\n\n` +
        `Ваша подписка активируется автоматически.`
      );

    case 'payment_failed':
      return (
        `❌ *Оплата не прошла*\n\n` +
        `К сожалению, не удалось обработать платёж.\n` +
        `Попробуйте ещё раз: /buy`
      );

    case 'subscription_activated':
      return (
        `🎉 *Подписка активирована!*\n\n` +
        `Тариф: *${payload.plan_name ?? 'VPN'}*\n` +
        `Действует до: ${payload.expires_at ?? '—'}\n\n` +
        `Ваш ключ готов: /mykey`
      );

    case 'subscription_expiring':
      return (
        `⚠️ *Подписка заканчивается*\n\n` +
        `Осталось дней: *${payload.days_left ?? '?'}*\n` +
        `Успейте продлить: /buy`
      );

    case 'subscription_expired':
      return (
        `🔴 *Подписка истекла*\n\n` +
        `Ваш доступ к VPN приостановлен.\n` +
        `Чтобы продолжить: /buy`
      );

    case 'vpn_key_ready':
      return (
        `🔑 *Ваш VPN-ключ готов!*\n\n` +
        `Скопируйте ключ и вставьте в приложение Outline:\n\n` +
        `\`${payload.access_key ?? ''}\`\n\n` +
        `Инструкция по настройке: /help`
      );

    default:
      return '📢 У вас новое уведомление от GOIDA VPN.';
  }
}
