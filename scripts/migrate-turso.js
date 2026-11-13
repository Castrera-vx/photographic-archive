
import db, { initTursoDb } from '../server/db/turso.js';

try {
  await initTursoDb();

  const result = await db.execute('SELECT name FROM sqlite_master WHERE type = ? ORDER BY name', ['table']);

  console.log('\nTablas disponibles en Turso:');
  for (const row of result.rows) {
    console.log(`- ${row.name}`);
  }

  console.log('\nConexión y migración completadas.');
} catch (error) {
  console.error('Error durante la migración:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
