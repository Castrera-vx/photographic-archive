
import { createClient } from '@libsql/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config.js';

if (!config.tursoUrl || !config.tursoAuthToken) {
  throw new Error(
    'Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en las variables de entorno'
  );
}

const db = createClient({
  url: config.tursoUrl,
  authToken: config.tursoAuthToken,
});

export async function initTursoDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const dir = path.join(config.root, 'server/db/migrations');
  const files = (await fs.readdir(dir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const version = Number.parseInt(file, 10);

    const existing = await db.execute({
      sql: 'SELECT version FROM schema_migrations WHERE version = ?',
      args: [version],
    });

    if (existing.rows.length > 0) {
      console.log(`Migración ${file}: ya aplicada`);
      continue;
    }

    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    const tx = await db.transaction('write');

    try {
      await tx.executeMultiple(sql);

      await tx.execute({
        sql: `INSERT INTO schema_migrations (version, filename)
              VALUES (?, ?)`,
        args: [version, file],
      });

      await tx.commit();
      console.log(`Migración ${file}: aplicada correctamente`);
    } catch (error) {
      await tx.rollback();
      throw new Error(`Falló la migración ${file}: ${error.message}`);
    } finally {
      tx.close();
    }
  }

  const result = await db.execute('SELECT COUNT(*) AS total FROM categories');
  console.log(`Categorías creadas: ${result.rows[0].total}`);
}

export default db;
