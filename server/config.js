import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// En local se lee .env; en produccion (Render, Railway...) no existe y se usan las variables del proveedor.
try { process.loadEnvFile(path.join(root, '.env')); } catch { /* sin .env */ }
const env = process.env;
const inRoot = (p, def) => path.resolve(root, p || def);

export default {
  root,
  port: Number(env.PORT) || 3000,
  isProd: env.NODE_ENV === 'production',
  trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : 0,
  adminUser: env.ADMIN_USER || 'admin',
  adminPasswordHash: env.ADMIN_PASSWORD_HASH || '',
  keepOriginals: env.KEEP_ORIGINALS !== 'false',
  sessionHours: Number(env.SESSION_HOURS) || 12,
  dbPath: env.DB_PATH === ':memory:' ? ':memory:' : inRoot(env.DB_PATH, 'storage/db/archive.sqlite'),
  photosDir: inRoot(env.PHOTOS_DIR, 'storage/photos'),
  privateDir: inRoot(env.PRIVATE_DIR, 'storage/private'),
  tursoUrl: env.TURSO_DATABASE_URL || '',
  tursoAuthToken: env.TURSO_AUTH_TOKEN || '',
};
