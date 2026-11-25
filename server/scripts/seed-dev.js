import { randomUUID } from 'node:crypto';
import pg from 'pg';

// SOLO DESARROLLO. Facultades y categorías iniciales para probar la publicación de hallazgos
// (US-008) hasta que US-023 permita administrarlas. Se ejecuta a mano: npm run db:seed-dev.
// Idempotente: no duplica ni modifica las que ya existan.
if (process.env.NODE_ENV === 'production') {
  throw new Error('db:seed-dev no se ejecuta en producción.');
}
if (!process.env.DATABASE_URL) {
  throw new Error('Configura DATABASE_URL en .env');
}

const facultades = [
  'Escuela Politécnica (Cáceres)',
  'Facultad de Ciencias (Badajoz)',
  'Facultad de Filosofía y Letras (Cáceres)',
  'Escuela de Ingenierías Industriales (Badajoz)',
];

const categorias = [
  'Electrónica',
  'Documentación y tarjetas',
  'Llaves',
  'Mochilas y bolsos',
  'Ropa y accesorios',
  'Material académico',
  'Otros',
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seedCatalog(table, names) {
  const values = names.flatMap(name => [randomUUID(), name]);
  const placeholders = names.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
  const { rowCount } = await pool.query(
    `INSERT INTO ${table} (id, nombre) VALUES ${placeholders} ON CONFLICT (nombre) DO NOTHING`,
    values,
  );
  console.log(`${table}: ${rowCount} nuevas, ${names.length - rowCount} ya existían.`);
}

try {
  await seedCatalog('facultades', facultades);
  await seedCatalog('categorias', categorias);
} catch {
  console.error('No se pudieron cargar los datos de desarrollo. Ejecuta antes npm run db:migrate.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
