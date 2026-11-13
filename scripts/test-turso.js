import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import db, { initTursoDb } from '../server/db/turso.js';

const id = `turso-check-${crypto.randomUUID()}`;
const payload = Buffer.from('photographic-archive-turso-blob-check');
let inserted = false;

try {
  await initTursoDb();

  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('categories','collections','photos','sessions','photo_assets')");
  const names = new Set(tables.rows.map((row) => row.name));
  for (const name of ['categories','collections','photos','sessions','photo_assets']) {
    assert.ok(names.has(name), `Falta la tabla ${name}`);
  }
  console.log('OK: conexión y esquema Turso');

  await db.execute({
    sql: "INSERT INTO photos (id,title,width,height) VALUES (?, 'Turso storage check', 1, 1)",
    args: [id],
  });
  inserted = true;

  await db.execute({
    sql: 'INSERT INTO photo_assets (photo_id,variant,mime_type,data) VALUES (?,?,?,?)',
    args: [id, 'thumb', 'image/webp', payload],
  });

  const result = await db.execute({
    sql: 'SELECT mime_type,data FROM photo_assets WHERE photo_id=? AND variant=?',
    args: [id, 'thumb'],
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].mime_type, 'image/webp');
  assert.deepEqual(Buffer.from(result.rows[0].data), payload);
  console.log('OK: escritura y lectura de BLOB en Turso');

  await db.execute({ sql: 'DELETE FROM photos WHERE id=?', args: [id] });
  inserted = false;
  const orphan = await db.execute({ sql: 'SELECT 1 FROM photo_assets WHERE photo_id=?', args: [id] });
  assert.equal(orphan.rows.length, 0);
  console.log('OK: eliminación de assets asociados');
  console.log('TURSO CHECK PASSED');
} catch (error) {
  console.error('TURSO CHECK FAILED:', error);
  process.exitCode = 1;
} finally {
  if (inserted) {
    await db.execute({ sql: 'DELETE FROM photos WHERE id=?', args: [id] }).catch(() => {});
  }
  await db.close();
}
