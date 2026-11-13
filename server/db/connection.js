import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';

if (config.dbPath !== ':memory:') fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Migraciones numeradas (001_*.sql, 002_*.sql...). La version se guarda en PRAGMA user_version.
const dir = path.join(config.root, 'server/db/migrations');
const current = db.pragma('user_version', { simple: true });
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const n = parseInt(file, 10);
  if (n <= current) continue;
  db.exec('BEGIN');
  try {
    db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
    db.pragma(`user_version = ${n}`);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
export default db;
