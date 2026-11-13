const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
let csrf = '';
let cats = [];
let cols = [];
let photos = [];

async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (method !== 'GET') headers['x-csrf-token'] = csrf;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(path, { method, headers, body: form || (body && JSON.stringify(body)) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const show = (loggedIn) => { $('#login').hidden = loggedIn; $('#panel').hidden = !loggedIn; };

async function load() {
  [cats, cols, { photos }] = await Promise.all([api('/api/categories'), api('/api/collections'), api('/api/photos')]);
  renderCollections();
  renderGrid();
}

function renderCollections() {
  $('#colList').replaceChildren(...cols.map((c) => {
    const del = el('button', { type: 'button', className: 'danger', textContent: 'Eliminar' });
    del.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar la colección «${c.name}»? Las fotografías no se borran.`)) return;
      try { await api(`/api/admin/collections/${c.slug}`, { method: 'DELETE' }); await load(); } catch (e) { alert(e.message); }
    });
    return el('li', {}, `${c.name} (${c.photoCount}) `, del);
  }));
}

function renderGrid() {
  $('#count').textContent = `(${photos.length})`;
  $('#grid').replaceChildren(...photos.map((p) => {
    const tags = [p.isFavorite && 'Favorita', p.isFeatured && 'Destacada'].filter(Boolean).join(' · ');
    const card = el('button', { type: 'button', className: 'card' },
      el('img', { src: p.urls.thumb, alt: p.title, loading: 'lazy' }),
      el('strong', {}, p.title), el('small', {}, tags || p.category?.name || 'Sin categoría'));
    card.addEventListener('click', () => openEditor(p));
    return card;
  }));
}

const FIELDS = [
  ['title', 'title', 'Título', 'text'], ['description', 'description', 'Descripción', 'textarea'],
  ['captured_at', 'capturedAt', 'Fecha de captura', 'date'], ['location', 'location', 'Ubicación', 'text'],
  ['camera', 'camera', 'Cámara', 'text'], ['lens', 'lens', 'Objetivo', 'text'],
  ['aperture', 'aperture', 'Apertura (f/)', 'number'], ['shutter', 'shutter', 'Velocidad de obturación', 'text'],
  ['iso', 'iso', 'ISO', 'number'], ['focal_length', 'focalLength', 'Distancia focal (mm)', 'number'],
];

function select(items, current) {
  const s = el('select', {}, el('option', { value: '', textContent: '—' }),
    ...items.map((i) => el('option', { value: i.slug, textContent: i.name })));
  s.value = current || '';
  return s;
}

function openEditor(p) {
  const inputs = {};
  const rows = FIELDS.map(([key, prop, label, type]) => {
    const input = type === 'textarea' ? el('textarea', { rows: 3 }) : el('input', { type, step: 'any' });
    input.value = p[prop] ?? '';
    inputs[key] = input;
    return el('label', {}, label, input);
  });
  const cat = select(cats, p.category?.slug);
  const col = select(cols, p.collection?.slug);
  const fav = el('input', { type: 'checkbox', checked: p.isFavorite });
  const feat = el('input', { type: 'checkbox', checked: p.isFeatured });
  const error = el('p', { className: 'error', role: 'alert' });
  const del = el('button', { type: 'button', className: 'danger', textContent: 'Eliminar' });
  const cancel = el('button', { type: 'button', textContent: 'Cerrar' });
  cancel.addEventListener('click', () => $('#editor').close());
  del.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar «${p.title}» y sus archivos? No se puede deshacer.`)) return;
    try { await api(`/api/admin/photos/${p.id}`, { method: 'DELETE' }); $('#editor').close(); await load(); } catch (e) { error.textContent = e.message; }
  });
  $('#editForm').replaceChildren(
    el('img', { src: p.urls.medium, alt: p.title }), ...rows,
    el('label', {}, 'Categoría', cat), el('label', {}, 'Colección', col),
    el('label', {}, fav, 'Favorita'), el('label', {}, feat, 'Destacada'),
    error, el('div', { className: 'row' }, el('button', { textContent: 'Guardar' }), cancel, del));
  $('#editForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = { category: cat.value || null, collection: col.value || null, is_favorite: fav.checked, is_featured: feat.checked };
    for (const key of Object.keys(inputs)) body[key] = inputs[key].value.trim() || null;
    try { await api(`/api/admin/photos/${p.id}`, { method: 'PATCH', body }); $('#editor').close(); await load(); } catch (err) { error.textContent = err.message; }
  };
  $('#editor').showModal();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    ({ csrf } = await api('/api/auth/login', { method: 'POST', body: { user: $('#user').value, password: $('#password').value } }));
    $('#password').value = '';
    $('#loginError').textContent = '';
    show(true);
    await load();
  } catch (err) { $('#loginError').textContent = err.message; }
});

$('#logout').addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST', body: {} }); } finally { csrf = ''; show(false); } });

$('#uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const files = [...$('#files').files];
  if (!files.length) return;
  const form = new FormData();
  files.forEach((f) => form.append('photos', f));
  $('#uploadMsg').textContent = `Subiendo ${files.length} archivo(s)…`;
  try {
    const { created, errors } = await api('/api/admin/photos', { method: 'POST', form });
    $('#uploadMsg').textContent = `${created.length} subida(s).${errors.map((x) => ` ${x.file}: ${x.error}.`).join('')}`;
  } catch (err) { $('#uploadMsg').textContent = err.message; }
  $('#files').value = '';
  await load();
});

$('#colForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/admin/collections', { method: 'POST', body: { name: $('#colName').value, description: $('#colDesc').value } });
    e.target.reset();
    await load();
  } catch (err) { alert(err.message); }
});

try { ({ csrf } = await api('/api/auth/me')); show(true); await load(); } catch { show(false); }
