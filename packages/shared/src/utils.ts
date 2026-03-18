import type { ApiResponse, ApiListResponse, ApiError, ApiErrorResponse, PaginationMeta } from './types';

/** Построить успешный ответ с одним ресурсом */
export function buildResponse<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data, ...(meta && { meta }) };
}

/** Построить ответ со списком */
export function buildListResponse<T>(
  data: T[],
  paginationMeta: PaginationMeta,
): ApiListResponse<T> {
  return { data, meta: paginationMeta };
}

/** Построить мета-данные пагинации */
export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  return {
    current_page: page,
    per_page: perPage,
    total,
    total_pages: Math.ceil(total / perPage),
  };
}

/** Построить ответ с ошибкой */
export function buildErrorResponse(errors: ApiError[]): ApiErrorResponse {
  return { errors };
}

/** Построить одну ошибку */
export function buildError(
  code: string,
  title: string,
  detail?: string,
  pointer?: string,
): ApiError {
  return {
    code,
    title,
    ...(detail && { detail }),
    ...(pointer && { source: { pointer } }),
  };
}

/** Вычислить offset для пагинации */
export function calcOffset(page: number, perPage: number): number {
  return (page - 1) * perPage;
}
