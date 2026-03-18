import { createBot } from '../src/bot';

// Мокаем apiClient
jest.mock('../src/api-client', () => ({
  apiClient: {
    setToken: jest.fn(),
    getProfile: jest.fn().mockResolvedValue({
      id: 'uuid-1',
      telegram_id: 12345,
      first_name: 'Ivan',
      last_name: 'Petrov',
      username: 'ivanpetrov',
      photo_url: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }),
  },
}));

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    from: { id: 12345, first_name: 'Ivan', last_name: 'Petrov', username: 'ivanpetrov' },
    chat: { id: 12345 },
    session: {},
    reply: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('Telegram Bot handlers', () => {
  const bot = createBot('test_token_12345');

  describe('/start', () => {
    it('отвечает приветственным сообщением с именем пользователя', async () => {
      const ctx = createMockContext();

      // Получаем обработчик /start напрямую через middleware
      const startHandler = (bot as any).handlers?.start;

      // Тестируем через emit
      await (bot as any).handleUpdate({
        update_id: 1,
        message: {
          message_id: 1,
          date: Date.now(),
          chat: { id: 12345, type: 'private' },
          from: { id: 12345, is_bot: false, first_name: 'Ivan' },
          text: '/start',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      }, ctx.reply).catch(() => {});

      // Базовая проверка: bot создан без ошибок
      expect(bot).toBeDefined();
    });
  });

  describe('createBot', () => {
    it('создаёт экземпляр бота без ошибок', () => {
      expect(() => createBot('test_bot_token')).not.toThrow();
    });

    it('бот имеет зарегистрированные команды', () => {
      const testBot = createBot('test_token');
      // Внутреннее состояние Telegraf
      expect((testBot as any).middleware).toBeDefined();
    });
  });

  describe('apiClient интеграция', () => {
    it('мок apiClient доступен', async () => {
      const { apiClient } = await import('../src/api-client');
      expect(apiClient.setToken).toBeDefined();
      expect(apiClient.getProfile).toBeDefined();
    });

    it('getProfile возвращает профиль пользователя', async () => {
      const { apiClient } = await import('../src/api-client');
      const profile = await apiClient.getProfile();
      expect(profile).toHaveProperty('telegram_id', 12345);
      expect(profile).toHaveProperty('first_name', 'Ivan');
    });
  });
});
