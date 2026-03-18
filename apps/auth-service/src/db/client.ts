import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres('postgresql://goida:password123@localhost:5432/auth_db', {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
});

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../migrations');

  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const [existing] = await sql`SELECT id FROM _migrations WHERE filename = ${file}`;
    if (existing) continue;

    const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await sql.unsafe(migrationSql);
    await sql`INSERT INTO _migrations (filename) VALUES (${file})`;
    console.info(`[DB] Migration applied: ${file}`);
  }
}

export default sql;
