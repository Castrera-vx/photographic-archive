import sharp from 'sharp';
import exifr from 'exifr';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config.js';
import { shapeExif } from './fields.js';

export const SIZES = { thumb: 480, medium: 1200, large: 2400 };
const FORMATS = { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' };
const TAGS = ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal'];

export async function removeFiles(id) {
  for (const name of Object.keys(SIZES)) await fs.rm(path.join(config.photosDir, name, `${id}.webp`), { force: true });
  for (const f of await fs.readdir(config.privateDir).catch(() => [])) {
    if (f.startsWith(`${id}.`)) await fs.rm(path.join(config.privateDir, f), { force: true });
  }
}

// Valida el formato real del archivo (no la extension), genera 3 tamanos WebP sin metadatos
// (sharp los elimina por defecto, incluido el GPS) y guarda el original en una carpeta privada.
export async function processImage(buffer) {
  const meta = await sharp(buffer).metadata().catch(() => null);
  const format = FORMATS[meta?.format];
  if (!format) throw new Error('Formato no admitido (solo JPG, PNG o WebP)');
  // pick: solo se leen estas etiquetas; no se pide ninguna de GPS.
  const raw = await exifr.parse(buffer, { pick: TAGS, reviveValues: false }).catch(() => null);
  const id = crypto.randomUUID();
  try {
    let large;
    for (const [name, px] of Object.entries(SIZES)) {
      const dir = path.join(config.photosDir, name);
      await fs.mkdir(dir, { recursive: true });
      const info = await sharp(buffer).rotate()
        .resize({ width: px, height: px, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: name === 'thumb' ? 74 : 82 })
        .toFile(path.join(dir, `${id}.webp`));
      if (name === 'large') large = info;
    }
    if (config.keepOriginals) {
      await fs.mkdir(config.privateDir, { recursive: true });
      await fs.writeFile(path.join(config.privateDir, `${id}.${meta.format === 'jpeg' ? 'jpg' : meta.format}`), buffer);
    }
    return { id, format, width: large.width, height: large.height, exif: shapeExif(raw || {}) };
  } catch (err) {
    await removeFiles(id);
    throw err;
  }
}
