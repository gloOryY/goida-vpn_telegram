# ☦ GOIDA VPN — Telegram VPN Shop

Микросервисная платформа для продажи VPN-подписок через Telegram-бота.

---

## Архитектура

```
┌─────────────────────────────────────────────────┐
│              Telegram Bot (Telegraf)            │
│          /start /help /profile /buy /mykey      │
└──────────────────────┬──────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────┐
│              API Gateway :3000                  │
│    JWT auth · rate limiting · proxy routing     │
└──────┬────────────────────────────┬─────────────┘
       │                            │
┌──────▼────────┐         ┌─────────▼──────────┐
│ Auth Service  │         │   VPN Service      │
│    :3001      │         │   :3002 (Этап 2)   │
│ PostgreSQL    │         │ PostgreSQL + Redis  │
└───────────────┘         └────────────────────┘
                          ┌─────────────────────┐
                          │  Payment Service    │
                          │  :3003 (Этап 2)     │
                          └─────────────────────┘
                          ┌─────────────────────┐
                          │ Notification Service│
                          │  :3004 (Этап 3)     │
                          └─────────────────────┘
```

### Сервисы

| Сервис | Порт | БД | Описание |
|---|---|---|---|
| `api-gateway` | 3000 | — | Единая точка входа, JWT, rate limiting |
| `auth-service` | 3001 | `auth_db` | Telegram-аутентификация, профили |
| `vpn-service` | 3002 | `vpn_db` | Тарифы, подписки, VPN-ключи |
| `payment-service` | 3003 | `payment_db` | Счета, вебхуки Telegram/ЮКасса |
| `notification-service` | 3004 | `notification_db` | Очередь уведомлений в Telegram |
| `telegram-bot` | — | — | Long polling, команды бота |
| `postgres` | 5432 | — | Основная СУБД (4 базы) |
| `redis` | 6379 | — | Кэш, сессии |

---

## Быстрый старт

### 1. Клонировать и настроить окружение

```bash
git clone https://github.com/your-org/goida-vpn_telegram.git
cd goida-vpn

cp .env.example .env
# Отредактируйте .env: укажите TELEGRAM_BOT_TOKEN и JWT_SECRET
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Запустить инфраструктуру (Postgres + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Запустить сервисы локально

```bash
# В отдельных терминалах:
npm run dev:auth          # Auth Service         → http://localhost:3001
npm run dev:gateway       # API Gateway          → http://localhost:3000
npm run dev:vpn           # VPN Service          → http://localhost:3002
npm run dev:payment       # Payment Service      → http://localhost:3003
npm run dev:notification  # Notification Service → http://localhost:3004
npm run dev:bot           # Telegram Bot         (long polling)
```

### 5. Запустить всё через Docker Compose (prod)

```bash
docker compose up --build
```

---

## API Reference

Все ответы соответствуют [Ensi API Design Guide](https://ensi-group.github.io/api-design-guide/).

### Формат ответа

**Успешный ответ:**
```json
{
  "data": { ... },
  "meta": { "current_page": 1, "per_page": 20, "total": 100, "total_pages": 5 }
}
```

**Ответ с ошибками:**
```json
{
  "errors": [
    { "code": "VALIDATION_ERROR", "title": "Validation failed", "detail": "..." }
  ]
}
```

### Эндпоинты

#### Auth Service
| Метод | Путь | Auth | Описание |
|---|---|---|---|
| `POST` | `/api/v1/auth/telegram` | — | Аутентификация через Telegram |
| `GET` | `/api/v1/profile` | JWT | Получить профиль |
| `PATCH` | `/api/v1/profile` | JWT | Обновить профиль |

#### VPN Service
| Метод | Путь | Auth | Описание |
|---|---|---|---|
| `GET` | `/api/v1/plans` | JWT | Список тарифов (с пагинацией) |
| `GET` | `/api/v1/plans/:id` | JWT | Тариф по ID |
| `GET` | `/api/v1/subscriptions` | JWT | Мои подписки |
| `POST` | `/api/v1/subscriptions` | JWT | Создать подписку (pending) |
| `GET` | `/api/v1/subscriptions/active` | JWT | Активная подписка |
| `GET` | `/api/v1/subscriptions/:id/key` | JWT | VPN-ключ подписки |

#### Payment Service
| Метод | Путь | Auth | Описание |
|---|---|---|---|
| `POST` | `/api/v1/invoices` | JWT | Создать счёт |
| `GET` | `/api/v1/invoices` | JWT | Мои счета |
| `GET` | `/api/v1/invoices/:id` | JWT | Счёт по ID |
| `POST` | `/api/v1/webhooks/telegram` | — | Webhook Telegram Stars |
| `POST` | `/api/v1/webhooks/yookassa` | — | Webhook ЮКасса |

---

## Тесты

```bash
# Запустить все тесты
npm test

# С покрытием (порог: 70%)
npm run test:coverage
```

---

## Качество кода

```bash
# Линтинг
npm run lint
npm run lint:fix

# Форматирование
npm run format
npm run format:check
```

Git hooks (Husky) автоматически запускают линтер и тесты перед каждым коммитом.

---

## Переменные окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather | — |
| `JWT_SECRET` | Секрет для подписи JWT | `super_secret...` |
| `JWT_EXPIRES_IN` | Время жизни токена | `7d` |
| `POSTGRES_USER` | Пользователь БД | `goida` |
| `POSTGRES_PASSWORD` | Пароль БД | `goida_secret` |
| `REDIS_PASSWORD` | Пароль Redis | `redis_secret` |
| `AUTH_SERVICE_URL` | URL Auth Service | `http://localhost:3001` |
| `API_GATEWAY_URL` | URL API Gateway | `http://localhost:3000` |

---

## Стек технологий

- **Runtime:** Node.js 20, TypeScript 5
- **Framework:** Fastify 4
- **Bot:** Telegraf 4
- **Database:** PostgreSQL 15, Redis 7
- **Testing:** Jest 29, Supertest
- **Quality:** ESLint (Airbnb), Prettier, Husky, lint-staged
- **DevOps:** Docker, Docker Compose

---

## Этапы разработки

- [x] **Этап 1** — Монорепозиторий, Auth Service, API Gateway, Telegram Bot (/start, /help)
- [ ] **Этап 2** — VPN Service, Payment Service, команды /buy и /mykey
- [ ] **Этап 3** — Notification Service, OpenAPI-спецификация, финальное тестирование

---

## Авторы

- **Прозоров** — Telegram Bot, Auth Service
- **Боднарь** — API Gateway, инфраструктура, DevOps
