import app from './app.js';
import config from './config.js';
import { purgeExpired } from './services/auth.js';

if (!config.adminPasswordHash) {
  console.warn('Aviso: ADMIN_PASSWORD_HASH no esta definido, el login queda deshabilitado. Ejecuta: npm run create-admin');
}
purgeExpired();
setInterval(purgeExpired, 3600e3).unref();
app.listen(config.port, () => console.log(`Photographic Archive en http://localhost:${config.port}`));
