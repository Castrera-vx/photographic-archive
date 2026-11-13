import { Router } from 'express';
import db from '../db/connection.js';
import { getPhoto, listPhotos, mediaUrls } from '../services/photos.js';

const r = Router();
const str = (v) => (typeof v === 'string' && v ? v : undefined);
const withCover = (row) => ({ ...row, cover: row.coverId ? mediaUrls(row.coverId) : null });

r.get('/categories', (req, res) => {
  const rows = db.prepare(`SELECT c.slug, c.name, COUNT(p.id) AS photoCount,
    (SELECT id FROM photos WHERE category_id = c.id ORDER BY is_featured DESC, created_at DESC LIMIT 1) AS coverId
    FROM categories c LEFT JOIN photos p ON p.category_id = c.id GROUP BY c.id ORDER BY c.position`).all();
  res.json(rows.map(withCover));
});

r.get('/collections', (req, res) => {
  const rows = db.prepare(`SELECT col.slug, col.name, col.description, col.created_at AS createdAt,
    COUNT(p.id) AS photoCount,
    COALESCE(col.cover_photo_id, (SELECT id FROM photos WHERE collection_id = col.id ORDER BY created_at LIMIT 1)) AS coverId
    FROM collections col LEFT JOIN photos p ON p.collection_id = col.id GROUP BY col.id ORDER BY col.created_at DESC`).all();
  res.json(rows.map(withCover));
});

r.get('/collections/:slug', (req, res) => {
  const col = db.prepare('SELECT slug, name, description, created_at AS createdAt FROM collections WHERE slug = ?').get(req.params.slug);
  if (!col) return res.status(404).json({ error: 'Coleccion no encontrada' });
  res.json({ ...col, ...listPhotos({ collection: col.slug, sort: 'asc' }) });
});

r.get('/photos', (req, res) => {
  const { category, collection, q, sort, limit } = req.query;
  res.json(listPhotos({
    category: str(category), collection: str(collection), q: str(q), sort: str(sort), limit: str(limit),
    favorite: req.query.favorite === '1', featured: req.query.featured === '1',
  }));
});

r.get('/photos/:id', (req, res) => {
  const photo = getPhoto(req.params.id);
  photo ? res.json(photo) : res.status(404).json({ error: 'Fotografia no encontrada' });
});

export default r;
