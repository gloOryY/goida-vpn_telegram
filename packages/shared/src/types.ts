// ─── Ensi API Design Guide — стандартные типы ответов ──────────────────────

/** Успешный ответ с одним ресурсом */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Успешный ответ со списком ресурсов */
export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Мета-данные пагинации */
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/** Объект ошибки */
export interface ApiError {
  code: string;
  title: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}

/** Ответ с ошибками */
export interface ApiErrorResponse {
  errors: ApiError[];
}

/** Параметры пагинации */
export interface PaginationQuery {
  page?: number;
  per_page?: number;
}

// ─── Auth типы ──────────────────────────────────────────────────────────────

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface UserProfile {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
}

// ─── Коды ошибок ────────────────────────────────────────────────────────────

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TELEGRAM_AUTH_INVALID: 'TELEGRAM_AUTH_INVALID',
  TELEGRAM_AUTH_EXPIRED: 'TELEGRAM_AUTH_EXPIRED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ─── HTTP Status helpers ─────────────────────────────────────────────────────

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
