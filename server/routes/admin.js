import express, { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { processImage, removeFiles } from '../services/images.js';
import { cleanCollection, cleanPhotoPatch } from '../services/fields.js';
import {
  createCollection, deleteCollection, deletePhoto, getPhoto, insertPhoto, updateCollection, updatePhoto,
} from '../services/photos.js';

const r = Router();
r.use(requireAuth); // todas las rutas de este archivo exigen sesion (y CSRF en escrituras)

const json = express.json({ limit: '20kb' });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024, files: 20 } });
const invalid = (res, e) => res.status(400).json({ error: e.message });
const notFound = (res) => res.status(404).json({ error: 'No encontrado' });

r.post('/photos', (req, res, next) => {
  upload.array('photos', 20)(req, res, (err) => {
    if (!err) return next();
    invalid(res, err.code === 'LIMIT_FILE_SIZE' ? new Error('Archivo demasiado grande (maximo 40 MB)') : err);
  });
}, async (req, res) => {
  const created = [];
  const errors = [];
  for (const f of req.files || []) {
    try {
      const img = await processImage(f.buffer);
      const title = f.originalname.replace(/\.[^.]+$/, '').slice(0, 200) || 'Sin titulo';
      insertPhoto({ id: img.id, title, original_format: img.format, width: img.width, height: img.height, ...img.exif });
      created.push(getPhoto(img.id));
    } catch (e) {
      errors.push({ file: f.originalname, error: e.message });
    }
  }
  const error = created.length ? undefined : errors.map((x) => `${x.file}: ${x.error}`).join(' | ') || 'No se recibio ningun archivo';
  res.status(created.length ? 201 : 400).json({ created, errors, error });
});

r.patch('/photos/:id', json, (req, res) => {
  try {
    const photo = updatePhoto(req.params.id, cleanPhotoPatch(req.body));
    photo ? res.json(photo) : notFound(res);
  } catch (e) { invalid(res, e); }
});

r.delete('/photos/:id', async (req, res) => {
  if (!deletePhoto(req.params.id)) return notFound(res);
  await removeFiles(req.params.id);
  res.json({ ok: true });
});

r.post('/collections', json, (req, res) => {
  try { res.status(201).json(createCollection(cleanCollection(req.body))); } catch (e) { invalid(res, e); }
});

r.patch('/collections/:slug', json, (req, res) => {
  try {
    const col = updateCollection(req.params.slug, cleanCollection(req.body, { requireName: false }));
    col ? res.json(col) : notFound(res);
  } catch (e) { invalid(res, e); }
});

r.delete('/collections/:slug', (req, res) => (deleteCollection(req.params.slug) ? res.json({ ok: true }) : notFound(res)));

export default r;
