import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

process.env.DB_PATH = ':memory:';
process.env.ADMIN_USER = 'admin';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-'));
process.env.PHOTOS_DIR = path.join(tmp, 'photos');
process.env.PRIVATE_DIR = path.join(tmp, 'private');
const { hashPassword } = await import('../server/services/password.js');
process.env.ADMIN_PASSWORD_HASH = hashPassword('contrasena-de-prueba');
const { default: db } = await import('../server/db/connection.js');
const { default: app } = await import('../server/app.js');

db.prepare(`INSERT INTO photos (id, title, category_id, width, height, is_featured)
  VALUES ('p1', 'Prueba', (SELECT id FROM categories WHERE slug = 'urban'), 3000, 2000, 1)`).run();

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const call = (path, opts) => fetch(base + path, opts);
const post = (path, body, headers = {}) => call(path, {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
let n = 0;
const ok = (name) => console.log(`ok ${++n} - ${name}`);

try {
  assert.equal((await (await call('/api/categories')).json()).length, 8); ok('8 categorias iniciales');
  const list = await (await call('/api/photos?featured=1')).json();
  assert.equal(list.total, 1);
  assert.equal(list.photos[0].urls.thumb, '/media/thumb/p1.webp'); ok('API publica de fotografias');
  assert.equal((await call('/api/auth/me')).status, 401); ok('area privada sin sesion: 401');
  assert.equal((await post('/api/auth/login', { user: 'admin', password: 'mala' })).status, 401); ok('login incorrecto: 401');
  const login = await post('/api/auth/login', { user: 'admin', password: 'contrasena-de-prueba' });
  assert.equal(login.status, 200);
  const { csrf } = await login.json();
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i); ok('login correcto con cookie HttpOnly');
  assert.equal((await call('/api/auth/me', { headers: { cookie } })).status, 200); ok('sesion valida');
  const h = { cookie, 'x-csrf-token': csrf };
  const send = (method, p, body) => call(p, { method, headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
  assert.equal((await call('/api/admin/photos/x', { method: 'PATCH' })).status, 401); ok('admin sin sesion: 401');
  const jpg = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#887766' } }).jpeg().toBuffer();
  const fd = new FormData();
  fd.append('photos', new Blob([jpg], { type: 'image/jpeg' }), 'prueba.jpg');
  const up = await call('/api/admin/photos', { method: 'POST', headers: h, body: fd });
  assert.equal(up.status, 201);
  const photo = (await up.json()).created[0];
  assert.deepEqual([photo.width, photo.height, photo.originalFormat, photo.title], [800, 600, 'JPEG', 'prueba']);
  for (const s of ['thumb', 'medium', 'large']) assert.equal((await call(photo.urls[s])).status, 200);
  ok('subida: miniaturas en 3 tamanos y metadatos');
  const nope = new FormData();
  nope.append('photos', new Blob(['no soy una imagen'], { type: 'text/plain' }), 'x.txt');
  assert.equal((await call('/api/admin/photos', { method: 'POST', headers: h, body: nope })).status, 400); ok('archivo no admitido: 400');
  const col = await (await send('POST', '/api/admin/collections', { name: 'Lima 2025' })).json();
  assert.equal(col.slug, 'lima-2025');
  const edited = await (await send('PATCH', `/api/admin/photos/${photo.id}`, { title: 'Nuevo', category: 'nature', collection: col.slug, is_favorite: true, iso: 400 })).json();
  assert.deepEqual([edited.title, edited.category.slug, edited.collection.slug, edited.isFavorite, edited.iso], ['Nuevo', 'nature', 'lima-2025', true, 400]);
  assert.equal((await send('PATCH', `/api/admin/photos/${photo.id}`, { title: '' })).status, 400); ok('edicion de metadatos y colecciones con validacion');
  assert.equal((await (await call(`/api/collections/${col.slug}`)).json()).total, 1);
  assert.equal((await send('DELETE', `/api/admin/photos/${photo.id}`)).status, 200);
  assert.equal((await call(photo.urls.thumb)).status, 404); ok('borrado elimina la foto y sus archivos');
  assert.equal((await post('/api/auth/logout', {}, { cookie })).status, 403); ok('escritura sin CSRF: 403');
  assert.equal((await post('/api/auth/logout', {}, { cookie, 'x-csrf-token': csrf })).status, 200);
  assert.equal((await call('/api/auth/me', { headers: { cookie } })).status, 401); ok('logout invalida la sesion');
  console.log('\nTodo correcto.');
} finally {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
