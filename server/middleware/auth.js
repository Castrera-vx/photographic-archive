import { getSession } from '../services/auth.js';
import { safeEqual } from '../services/password.js';

export const COOKIE = 'pa_session';

export function sessionToken(req) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

// Protege las rutas administrativas. Las escrituras exigen ademas el token CSRF.
export function requireAuth(req, res, next) {
  const session = getSession(sessionToken(req));
  if (!session) return res.status(401).json({ error: 'No autenticado' });
  if (!['GET', 'HEAD'].includes(req.method) && !safeEqual(req.get('x-csrf-token') || '', session.csrf)) {
    return res.status(403).json({ error: 'Token CSRF invalido' });
  }
  req.session = session;
  next();
}
