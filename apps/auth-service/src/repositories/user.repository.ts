import sql from '../db/client';
import type { UserProfile } from '@goida-vpn/shared';

export interface CreateUserDto {
  telegram_id: number;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
}

export interface UpdateUserDto {
  first_name?: string;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
}

export async function findByTelegramId(telegramId: number): Promise<UserProfile | null> {
  const [user] = await sql<UserProfile[]>`
    SELECT id, telegram_id, first_name, last_name, username, photo_url,
           created_at::text, updated_at::text
    FROM users
    WHERE telegram_id = ${telegramId}
  `;
  return user ?? null;
}

export async function findById(id: string): Promise<UserProfile | null> {
  const [user] = await sql<UserProfile[]>`
    SELECT id, telegram_id, first_name, last_name, username, photo_url,
           created_at::text, updated_at::text
    FROM users
    WHERE id = ${id}
  `;
  return user ?? null;
}

export async function upsertUser(dto: CreateUserDto): Promise<UserProfile> {
  const [user] = await sql<UserProfile[]>`
    INSERT INTO users (telegram_id, first_name, last_name, username, photo_url)
    VALUES (${dto.telegram_id}, ${dto.first_name}, ${dto.last_name ?? null},
            ${dto.username ?? null}, ${dto.photo_url ?? null})
    ON CONFLICT (telegram_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name  = EXCLUDED.last_name,
      username   = EXCLUDED.username,
      photo_url  = EXCLUDED.photo_url,
      updated_at = NOW()
    RETURNING id, telegram_id, first_name, last_name, username, photo_url,
              created_at::text, updated_at::text
  `;
  return user;
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<UserProfile | null> {
  const [user] = await sql<UserProfile[]>`
    UPDATE users
    SET
      first_name = COALESCE(${dto.first_name ?? null}, first_name),
      last_name  = COALESCE(${dto.last_name ?? null}, last_name),
      username   = COALESCE(${dto.username ?? null}, username),
      photo_url  = COALESCE(${dto.photo_url ?? null}, photo_url),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, telegram_id, first_name, last_name, username, photo_url,
              created_at::text, updated_at::text
  `;
  return user ?? null;
}
