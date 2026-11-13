import { createClient } from '@libsql/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config.js';

if (!config.tursoUrl || !config.tursoAuthToken) throw new Error('Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');

const db = createClient({ url: config.tursoUrl, authToken: config.tursoAuthToken });

export async function initTursoDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY, filename TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const dir = path.join(config.root, 'server/db/migrations');
  const files = (await fs.readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  for (const file of files) {
    const version = Number.parseInt(file, 10);
    const known = await db.execute({ sql: 'SELECT version FROM schema_migrations WHERE version = ?', args: [version] });
    if (known.rows.length) continue;
    if (version === 1) {
      const existing = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'");
      if (existing.rows.length) {
        await db.execute({ sql: 'INSERT INTO schema_migrations (version,filename) VALUES (?,?)', args: [version,file] });
        continue;
      }
    }
    const sql = await fs.readFile(path.join(dir,file),'utf8');
    const tx = await db.transaction('write');
    try {
      for (const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) await tx.execute(statement);
      await tx.execute({ sql:'INSERT INTO schema_migrations (version,filename) VALUES (?,?)', args:[version,file] });
      await tx.commit();
    } catch (error) { await tx.rollback(); throw new Error(`Migración ${file}: ${error.message}`); }
    finally { tx.close(); }
  }
}
export default db;
