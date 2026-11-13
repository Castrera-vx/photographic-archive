import db from '../db/connection.js';

export const mediaUrls = (id) => ({
  thumb: `/media/thumb/${id}.webp`,
  medium: `/media/medium/${id}.webp`,
  large: `/media/large/${id}.webp`,
});

const BASE = `SELECT p.*, c.slug AS category_slug, c.name AS category_name,
  col.slug AS collection_slug, col.name AS collection_name
  FROM photos p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN collections col ON col.id = p.collection_id`;

// Solo campos publicos: nunca se expone GPS ni rutas internas.
export const toPublic = (p) => ({
  id: p.id, title: p.title, description: p.description,
  capturedAt: p.captured_at, location: p.location,
  category: p.category_slug ? { slug: p.category_slug, name: p.category_name } : null,
  collection: p.collection_slug ? { slug: p.collection_slug, name: p.collection_name } : null,
  camera: p.camera, lens: p.lens, aperture: p.aperture, shutter: p.shutter, iso: p.iso,
  focalLength: p.focal_length, originalFormat: p.original_format,
  width: p.width, height: p.height,
  isFavorite: !!p.is_favorite, isFeatured: !!p.is_featured,
  urls: mediaUrls(p.id),
});

export function listPhotos({ category, collection, q, favorite, featured, sort, limit } = {}) {
  const where = [];
  const args = [];
  if (category) { where.push('c.slug = ?'); args.push(category); }
  if (collection) { where.push('col.slug = ?'); args.push(collection); }
  if (favorite) where.push('p.is_favorite = 1');
  if (featured) where.push('p.is_featured = 1');
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    where.push("(p.title LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')");
    args.push(like, like);
  }
  let sql = `${BASE}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
    ORDER BY COALESCE(p.captured_at, p.created_at) ${sort === 'asc' ? 'ASC' : 'DESC'}, p.id`;
  const n = Math.min(Math.max(parseInt(limit, 10) || 0, 0), 500);
  if (n) { sql += ' LIMIT ?'; args.push(n); }
  const photos = db.prepare(sql).all(...args).map(toPublic);
  return { total: photos.length, photos };
}

export const getPhoto = (id) => {
  const row = db.prepare(`${BASE} WHERE p.id = ?`).get(id);
  return row ? toPublic(row) : null;
};

// ---- Escritura (solo se usa desde rutas protegidas) ----
import { slugify } from './fields.js';

export function insertPhoto(p) {
  db.prepare(`INSERT INTO photos (id, title, captured_at, camera, lens, aperture, shutter, iso, focal_length, original_format, width, height)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(p.id, p.title, p.captured_at ?? null, p.camera ?? null, p.lens ?? null, p.aperture ?? null, p.shutter ?? null,
      p.iso ?? null, p.focal_length ?? null, p.original_format, p.width, p.height);
}

function lookup(table, slug) {
  if (!slug) return null;
  const row = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug);
  if (!row) throw new Error(table === 'categories' ? 'Categoria desconocida' : 'Coleccion desconocida');
  return row.id;
}

// "patch" debe venir de cleanPhotoPatch (lista blanca de columnas).
export function updatePhoto(id, patch) {
  const { category, collection, ...cols } = patch;
  if ('category' in patch) cols.category_id = lookup('categories', category);
  if ('collection' in patch) cols.collection_id = lookup('collections', collection);
  const keys = Object.keys(cols);
  if (keys.length) {
    const sql = `UPDATE photos SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
    if (!db.prepare(sql).run(...keys.map((k) => cols[k]), id).changes) return null;
  }
  return getPhoto(id);
}

export function deletePhoto(id) {
  const { changes } = db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  if (changes) db.prepare('UPDATE collections SET cover_photo_id = NULL WHERE cover_photo_id = ?').run(id);
  return changes > 0;
}

export function createCollection({ name, description = '' }) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; db.prepare('SELECT 1 FROM collections WHERE slug = ?').get(slug); i++) slug = `${base}-${i}`;
  db.prepare('INSERT INTO collections (slug, name, description) VALUES (?, ?, ?)').run(slug, name, description);
  return { slug, name, description };
}

export function updateCollection(slug, patch) {
  const keys = Object.keys(patch);
  if (keys.length && !db.prepare(`UPDATE collections SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE slug = ?`)
    .run(...keys.map((k) => patch[k]), slug).changes) return null;
  return db.prepare('SELECT slug, name, description FROM collections WHERE slug = ?').get(slug) ?? null;
}

export const deleteCollection = (slug) => db.prepare('DELETE FROM collections WHERE slug = ?').run(slug).changes > 0;
