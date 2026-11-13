import crypto from 'node:crypto';

const sha = (t) => crypto.createHash('sha256').update(String(t)).digest();

// Comparacion en tiempo constante (ambos lados pasan por SHA-256 y quedan del mismo largo).
export const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [alg, salt, key] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
