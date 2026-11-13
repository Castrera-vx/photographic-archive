// Funciones puras: validacion de datos y formato de EXIF. Nunca se lee ni se guarda GPS.
const TEXT = { title: 200, description: 2000, location: 200, camera: 120, lens: 120, shutter: 20 };

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'coleccion';

function text(v, key, max) {
  if (v !== null && v !== undefined && typeof v !== 'string') throw new Error(`Valor invalido en ${key}`);
  return (v ?? '').trim().slice(0, max);
}

export function cleanPhotoPatch(b = {}) {
  const out = {};
  for (const [key, max] of Object.entries(TEXT)) {
    if (!(key in b)) continue;
    const v = text(b[key], key, max);
    if (key === 'title' && !v) throw new Error('El titulo no puede estar vacio');
    out[key] = key === 'description' ? v : v || null;
  }
  if ('captured_at' in b) {
    if (b.captured_at && !/^\d{4}-\d{2}-\d{2}$/.test(b.captured_at)) throw new Error('Fecha invalida (AAAA-MM-DD)');
    out.captured_at = b.captured_at || null;
  }
  for (const [key, isInt] of [['aperture', false], ['focal_length', false], ['iso', true]]) {
    if (!(key in b)) continue;
    if (b[key] === null || b[key] === '') { out[key] = null; continue; }
    const n = Number(b[key]);
    if (!Number.isFinite(n) || n <= 0 || n > 1e6) throw new Error(`Valor invalido en ${key}`);
    out[key] = isInt ? Math.round(n) : n;
  }
  for (const key of ['is_favorite', 'is_featured']) if (key in b) out[key] = b[key] ? 1 : 0;
  if ('category' in b) out.category = b.category || null;
  if ('collection' in b) out.collection = b.collection || null;
  return out;
}

export function cleanCollection(b = {}, { requireName = true } = {}) {
  const out = {};
  if ('name' in b || requireName) {
    out.name = text(b.name, 'name', 120);
    if (!out.name) throw new Error('El nombre no puede estar vacio');
  }
  if ('description' in b) out.description = text(b.description, 'description', 1000);
  return out;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function shapeExif(r = {}) {
  const make = String(r.Make || '').trim();
  const model = String(r.Model || '').trim();
  const camera = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
  const t = num(r.ExposureTime);
  const d = r.DateTimeOriginal;
  const date = typeof d === 'string' ? d.slice(0, 10).replaceAll(':', '-') : d instanceof Date ? d.toISOString().slice(0, 10) : '';
  return {
    camera: camera.trim() || null,
    lens: String(r.LensModel || '').trim() || null,
    aperture: num(r.FNumber),
    shutter: t ? (t < 1 ? `1/${Math.round(1 / t)}` : `${t}s`) : null,
    iso: num(r.ISO),
    focal_length: num(r.FocalLength),
    captured_at: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
  };
}
