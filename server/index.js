import app from './app.js';
import config from './config.js';
import {initTursoDb,default as db} from './db/turso.js';
import {purgeExpired} from './services/auth.js';
if(!config.adminPasswordHash)console.warn('Aviso: ADMIN_PASSWORD_HASH no esta definido, el login queda deshabilitado. Ejecuta: npm run create-admin');
try{await initTursoDb();await purgeExpired();setInterval(()=>purgeExpired().catch(console.error),3600e3).unref();app.listen(config.port,()=>console.log(`Photographic Archive en puerto ${config.port}`));}
catch(error){console.error('No se pudo iniciar la aplicación:',error);await db.close();process.exit(1);}
