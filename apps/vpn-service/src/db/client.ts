import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres(
  process.env.DATABASE_URL_VPN || process.env.DATABASE_URL || 'postgresql://goida:goida_secret@localhost:5432/vpn_db',
  { max: 10, idle_timeout: 30, connect_timeout: 10 },
);

export async function runMigrations(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Функция update_updated_at_column нужна всем таблицам — создаём первой
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ language 'plpgsql'
  `;

  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const [existing] = await sql`SELECT id FROM _migrations WHERE filename = ${file}`;
    if (existing) continue;
    const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await sql.unsafe(migrationSql);
    await sql`INSERT INTO _migrations (filename) VALUES (${file})`;
    console.info(`[VPN DB] Migration applied: ${file}`);
  }
}

export default sql;
