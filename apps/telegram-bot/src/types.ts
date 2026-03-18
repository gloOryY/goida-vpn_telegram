export interface BotSession {
  /** JWT access_token после авторизации */
  accessToken?: string;
  /** Telegram user id (для идентификации сессии) */
  telegramId?: number;
}
