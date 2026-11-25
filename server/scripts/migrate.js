import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('Configura DATABASE_URL en .env');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  // Ejecutar las migraciones en orden, sin borrar datos existentes.
  const migrations = [
    '001-usuarios.sql',
    '002-sesiones.sql',
    '003-perfil.sql',
    '004-recuperacion.sql',
    '005-cambios-contrasena.sql',
    '006-bloqueo-contrasena.sql',
    '007-hallazgos.sql',
    '008-historial-hallazgos.sql',
    '009-avisos.sql',
  ];

  await migrations.reduce(async (previous, filename) => {
    await previous;
    const sql = await readFile(new URL(`../db/migrations/${filename}`, import.meta.url), 'utf8');
    await pool.query(sql);
    console.log(`Migración preparada: ${filename}`);
  }, Promise.resolve());
} catch {
  console.error(
    'No se pudo preparar la base de datos. Revisa su disponibilidad y configuración.',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
