import crypto from 'node:crypto';
import config from '../config.js';
import db from '../db/connection.js';
import { safeEqual, verifyPassword } from './password.js';

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

export function checkCredentials(user, password) {
  const userOk = safeEqual(user, config.adminUser);
  const passOk = verifyPassword(password, config.adminPasswordHash); // siempre se ejecuta
  return userOk && passOk;
}

// El token viaja en la cookie; en la base solo se guarda su hash.
export function createSession() {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO sessions (id, csrf, expires_at) VALUES (?, ?, ?)')
    .run(sha(token), csrf, Date.now() + config.sessionHours * 3600e3);
  return { token, csrf };
}

export function getSession(token) {
  if (!token) return null;
  const row = db.prepare('SELECT id, csrf, expires_at FROM sessions WHERE id = ?').get(sha(token));
  return row && row.expires_at > Date.now() ? row : null;
}

export const destroySession = (token) => db.prepare('DELETE FROM sessions WHERE id = ?').run(sha(token));
export const purgeExpired = () => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
