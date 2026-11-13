import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config.js';
import { checkCredentials, createSession, destroySession } from '../services/auth.js';
import { COOKIE, requireAuth, sessionToken } from '../middleware/auth.js';

const r = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intentalo mas tarde.' },
});

r.post('/login', limiter, express.json({ limit: '1kb' }), (req, res) => {
  const { user, password } = req.body || {};
  if (typeof user !== 'string' || typeof password !== 'string' || !checkCredentials(user, password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const { token, csrf } = createSession();
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: config.isProd, path: '/', maxAge: config.sessionHours * 3600e3,
  });
  res.json({ csrf });
});

r.get('/me', requireAuth, (req, res) => res.json({ csrf: req.session.csrf }));

r.post('/logout', requireAuth, (req, res) => {
  destroySession(sessionToken(req));
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

export default r;
