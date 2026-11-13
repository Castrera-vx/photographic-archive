import { ABOUT, CONTACT, HEADLINE, INTRO, INTRO_TITLE, PROFILE, VISION } from '/js/content.js';

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');

function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k in n) n[k] = v; else n.setAttribute(k, v);
  }
  n.append(...kids.flat().filter((x) => x !== null && x !== undefined && x !== false));
  return n;
}
const api = async (path) => {
  const r = await fetch(path);
  if (!r.ok) throw new Error(r.status === 404 ? 'No encontrado' : `Error ${r.status}`);
  return r.json();
};
const fmtDate = (d, o = { year: 'numeric', month: 'long', day: 'numeric' }) =>
  d ? new Date(d.length > 10 ? `${d.replace(' ', 'T')}Z` : `${d}T12:00:00`).toLocaleDateString('es', o) : '';
const plural = (n) => `${n} ${n === 1 ? 'fotografía' : 'fotografías'}`;
const link = (href, text) => h('a', { href }, text);
const state = (text) => h('p', { className: 'state' }, text);
const errorState = (err, retry) => h('div', { className: 'state' }, h('p', {}, `No se pudo cargar (${err.message}).`), h('button', { type: 'button', onclick: retry }, 'Reintentar'));
const pageHead = (title, sub) => h('header', { className: 'page-head' }, h('h1', {}, title), sub && h('p', { className: 'sub' }, sub));
const fadeIn = (img, src) => { img.addEventListener('load', () => img.classList.add('in')); img.src = src; };

// ---------- Galería ----------
const shape = (p) => { const r = p.width / p.height; return r >= 1.75 ? 'pano' : r > 1.1 ? 'land' : 'port'; };
function gallery(list, layout = 'masonry') {
  const g = h('div', { className: `gallery ${layout}` });
  list.forEach((p, i) => {
    const img = h('img', { alt: p.title, width: p.width, height: p.height, loading: i < 4 ? 'eager' : 'lazy', decoding: 'async' });
    fadeIn(img, layout === 'editorial' ? p.urls.medium : p.urls.thumb);
    const b = h('button', { type: 'button', className: layout === 'editorial' ? `ph rv ${shape(p)}` : 'ph', 'aria-label': `Ampliar: ${p.title}` }, img, h('span', { className: 'cap' }, p.title));
    b.addEventListener('click', () => openLb(list, i, b));
    g.append(b);
  });
  return g;
}

function card(href, title, desc, meta, cover) {
  const box = h('div', { className: 'cover' });
  if (cover) { const img = h('img', { alt: '', loading: 'lazy', decoding: 'async' }); fadeIn(img, cover.medium); box.append(img); }
  return h('a', { href, className: 'card' }, box, h('h3', {}, title), desc && h('p', {}, desc), h('p', {}, meta));
}

// ---------- Vistas ----------
const spans = (lines) => lines.map((l) => h('span', {}, l));
const label = (n, text) => h('p', { className: 'lab' }, h('span', {}, n), h('span', {}, text));

async function home() {
  document.title = PROFILE.name ? `${PROFILE.name} · Photographic Archive` : 'Photographic Archive';
  let [{ photos: list }, cats] = await Promise.all([api('/api/photos?featured=1&limit=9'), api('/api/categories')]);
  if (!list.length) ({ photos: list } = await api('/api/photos?limit=9'));
  const lead = list[0];
  let shot = null;
  if (lead) {
    const img = h('img', { alt: lead.title, width: lead.width, height: lead.height, decoding: 'async', fetchpriority: 'high' });
    fadeIn(img, lead.urls.large);
    shot = h('button', { type: 'button', className: 'shot', 'aria-label': `Ampliar: ${lead.title}` }, img);
    shot.addEventListener('click', () => openLb(list, 0, shot));
  }
  const hero = h('section', { className: 'hero2' }, h('h1', {}, spans(HEADLINE)), shot,
    h('p', { className: 'tag' }, [PROFILE.name, PROFILE.role].filter(Boolean).join(' — ') || 'Portafolio fotográfico'));
  const intro = h('section', { className: 'sec intro rv' }, label('01', 'Introducción'),
    h('div', { className: 'cols' }, h('h2', {}, spans(INTRO_TITLE)),
      h('div', {}, h('p', { className: 'lead' }, INTRO), h('p', { className: 'links' }, link('/collections', 'Colecciones'), link('/archive', 'Archivo completo')))));
  const used = cats.filter((c) => c.photoCount > 0);
  const spec = used.length > 0 && h('section', { className: 'sec spec rv' }, label('02', 'Especialidades'),
    h('ul', {}, used.map((c, i) => h('li', {}, h('a', { href: `/archive?category=${c.slug}` },
      h('span', { className: 'n' }, String(i + 1).padStart(2, '0')), h('span', { className: 'nm' }, c.name),
      h('span', { className: 'ct', 'aria-label': plural(c.photoCount) }, String(c.photoCount)))))));
  const rest = list.slice(1);
  const port = rest.length > 0 && h('section', { className: 'sec port' }, label('03', 'Portfolio'), h('h2', { className: 'rv' }, 'Selección'), gallery(rest, 'editorial'));
  const vision = h('section', { className: 'vision' }, VISION.map((v, i) => h('div', { className: `v${i + 1} rv` }, h('h2', {}, v.title), h('p', {}, v.text))));
  const contact = (CONTACT.email || CONTACT.links.length > 0) && h('section', { className: 'sec contact' }, label('04', 'Contacto'), h('h2', {}, 'Contact'),
    h('div', { className: 'cgrid rv' }, CONTACT.email && h('div', {}, h('small', {}, 'Correo'), h('a', { href: `mailto:${CONTACT.email}` }, CONTACT.email)),
      CONTACT.links.map((l) => h('div', {}, h('small', {}, 'Web'), h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label)))));
  return [hero, intro, spec, port, vision, contact];
}

async function collections() {
  document.title = 'Collections · Photographic Archive';
  const [cols, cats] = await Promise.all([api('/api/collections'), api('/api/categories')]);
  const used = cats.filter((c) => c.photoCount > 0);
  return [
    pageHead('Collections', 'Series, proyectos y categorías del archivo.'),
    h('h2', {}, 'Colecciones'),
    cols.length ? h('div', { className: 'cards' }, cols.map((c) => card(`/collections/${c.slug}`, c.name, c.description,
      `${plural(c.photoCount)} · ${fmtDate(c.createdAt, { year: 'numeric', month: 'long' })}`, c.cover))) : state('Todavía no hay colecciones.'),
    h('h2', {}, 'Categorías'),
    used.length ? h('div', { className: 'cards' }, used.map((c) => card(`/archive?category=${c.slug}`, c.name, '', plural(c.photoCount), c.cover))) : state('Todavía no hay categorías con fotografías.'),
  ];
}

async function collection(slug) {
  const c = await api(`/api/collections/${slug}`);
  document.title = `${c.name} · Photographic Archive`;
  return [pageHead(c.name, c.description), h('p', { className: 'count' }, `${plural(c.total)} · ${fmtDate(c.createdAt, { year: 'numeric', month: 'long' })}`),
    c.photos.length ? gallery(c.photos, 'editorial') : state('Esta colección aún no tiene fotografías.'), h('p', { className: 'back' }, link('/collections', '← Collections'))];
}

async function archive() {
  document.title = 'Archive · Photographic Archive';
  const cats = (await api('/api/categories'));
  const sp = new URLSearchParams(location.search);
  const st = { category: sp.get('category') || '', q: sp.get('q') || '', sort: sp.get('sort') === 'asc' ? 'asc' : 'desc', layout: sp.get('layout') === 'grid' ? 'grid' : 'masonry' };
  let seq = 0;
  const box = h('div');
  const count = h('p', { className: 'count', role: 'status' });
  const search = h('input', { type: 'search', placeholder: 'Buscar por nombre o descripción', 'aria-label': 'Buscar fotografías', value: st.q });
  const order = h('select', { 'aria-label': 'Orden' }, h('option', { value: 'desc' }, 'Más recientes'), h('option', { value: 'asc' }, 'Más antiguas'));
  order.value = st.sort;
  const chipEls = [];
  const layoutEls = [];
  const paint = () => {
    chipEls.forEach(([s, b]) => b.setAttribute('aria-pressed', String(s === st.category)));
    layoutEls.forEach(([l, b]) => b.setAttribute('aria-pressed', String(l === st.layout)));
  };
  const toggle = (list, slug, label, onClick) => {
    const b = h('button', { type: 'button', className: 'chip' }, label);
    b.addEventListener('click', onClick);
    list.push([slug, b]);
    return b;
  };
  const syncUrl = () => {
    const p = new URLSearchParams();
    if (st.category) p.set('category', st.category);
    if (st.q) p.set('q', st.q);
    if (st.sort !== 'desc') p.set('sort', st.sort);
    if (st.layout !== 'masonry') p.set('layout', st.layout);
    history.replaceState(null, '', `/archive${p.toString() ? `?${p}` : ''}`);
  };
  async function refresh() {
    const n = ++seq;
    syncUrl();
    paint();
    const p = new URLSearchParams({ sort: st.sort });
    if (st.category) p.set('category', st.category);
    if (st.q) p.set('q', st.q);
    try {
      const { photos, total } = await api(`/api/photos?${p}`);
      if (n !== seq) return;
      count.textContent = plural(total);
      box.replaceChildren(total ? gallery(photos, st.layout) : state('No hay fotografías con esos criterios.'));
    } catch (e) { if (n === seq) box.replaceChildren(errorState(e, refresh)); }
  }
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { st.q = search.value.trim(); if (box.isConnected) refresh(); }, 250);
  });
  order.addEventListener('change', () => { st.sort = order.value; refresh(); });
  const chips = h('div', { className: 'chips', role: 'group', 'aria-label': 'Categorías' },
    toggle(chipEls, '', 'Todas', () => { st.category = ''; refresh(); }),
    cats.filter((c) => c.photoCount > 0 || c.slug === st.category).map((c) => toggle(chipEls, c.slug, `${c.name} (${c.photoCount})`, () => { st.category = c.slug; refresh(); })));
  const layouts = h('div', { className: 'chips', role: 'group', 'aria-label': 'Distribución' },
    toggle(layoutEls, 'masonry', 'Masonry', () => { st.layout = 'masonry'; box.firstElementChild?.classList.replace('grid', 'masonry'); syncUrl(); paint(); }),
    toggle(layoutEls, 'grid', 'Grid', () => { st.layout = 'grid'; box.firstElementChild?.classList.replace('masonry', 'grid'); syncUrl(); paint(); }));
  refresh();
  return [pageHead('Archive'), h('div', { className: 'controls' }, search, order, layouts), chips, count, box];
}

async function favorites() {
  document.title = 'Favorites · Photographic Archive';
  const { photos, total } = await api('/api/photos?favorite=1&sort=desc');
  return [pageHead('Favorites', 'Las fotografías que más me importan.'), h('p', { className: 'count' }, plural(total)),
    photos.length ? gallery(photos) : state('Todavía no hay favoritas.')];
}

async function about() {
  document.title = 'About · Photographic Archive';
  return [pageHead('About', [PROFILE.name, PROFILE.role].filter(Boolean).join(' — ')), h('div', { className: 'prose' }, ABOUT.map((t) => h('p', {}, t)))];
}

// ---------- Visor (lightbox) ----------
const lb = $('#lb');
const lbImg = $('#lb-img');
const lbPrev = $('#lb-prev');
const lbNext = $('#lb-next');
let cur = { list: [], i: 0, from: null };
const setText = (id, text) => { const n = $(id); n.textContent = text || ''; n.hidden = !text; };

function showLb() {
  const { list, i } = cur;
  const p = list[i];
  lbImg.classList.remove('in');
  lbImg.alt = p.title;
  lbImg.src = p.urls.large;
  const shutter = p.shutter && (/s$/.test(p.shutter) ? p.shutter : `${p.shutter} s`);
  setText('#lb-title', p.title);
  setText('#lb-meta', [fmtDate(p.capturedAt), p.location, p.category?.name].filter(Boolean).join(' · '));
  setText('#lb-desc', p.description);
  setText('#lb-exif', [p.camera, p.lens, p.aperture && `ƒ/${p.aperture}`, shutter, p.iso && `ISO ${p.iso}`, p.focalLength && `${p.focalLength} mm`].filter(Boolean).join('  ·  '));
  setText('#lb-count', `${i + 1} / ${list.length}`);
  lbPrev.disabled = i === 0;
  lbNext.disabled = i === list.length - 1;
  lbPrev.hidden = lbNext.hidden = list.length < 2;
  [i - 1, i + 1].forEach((j) => { if (list[j]) new Image().src = list[j].urls.large; });
}
function openLb(list, i, from) {
  cur = { list, i, from };
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  showLb();
  $('#lb-close').focus();
}
function closeLb() {
  if (lb.hidden) return;
  lb.hidden = true;
  document.body.style.overflow = '';
  lbImg.removeAttribute('src');
  if (cur.from?.isConnected) cur.from.focus();
}
const step = (d) => { const j = cur.i + d; if (j >= 0 && j < cur.list.length) { cur.i = j; showLb(); } };

lbImg.addEventListener('load', () => lbImg.classList.add('in'));
$('#lb-close').addEventListener('click', closeLb);
lbPrev.addEventListener('click', () => step(-1));
lbNext.addEventListener('click', () => step(1));
$('#lb-stage').addEventListener('click', (e) => { if (e.target !== lbImg) closeLb(); });
let x0 = null;
lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => { if (x0 !== null && Math.abs(e.changedTouches[0].clientX - x0) > 50) step(e.changedTouches[0].clientX < x0 ? 1 : -1); x0 = null; });
document.addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLb();
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'Tab') {
    const f = [...lb.querySelectorAll('button:not([hidden]):not(:disabled)')];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});

// ---------- Enrutador ----------
const routes = [[/^\/$/, home], [/^\/collections$/, collections], [/^\/collections\/([\w-]+)$/, collection],
  [/^\/archive$/, archive], [/^\/favorites$/, favorites], [/^\/about$/, about]];
let navId = 0;

async function render() {
  const id = ++navId;
  const path = location.pathname.replace(/\/+$/, '') || '/';
  closeLb();
  setMenu(false);
  document.querySelectorAll('#nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (path === href || path.startsWith(`${href}/`)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  main.replaceChildren(state('Cargando…'));
  for (const [re, view] of routes) {
    const m = path.match(re);
    if (!m) continue;
    try {
      const nodes = await view(...m.slice(1));
      if (id === navId) { const ns = nodes.filter(Boolean); main.replaceChildren(...(view === home ? ns : [h('div', { className: 'wrap' }, ns)])); reveal(); }
    } catch (e) { if (id === navId) main.replaceChildren(errorState(e, render)); }
    return;
  }
  document.title = 'No encontrado · Photographic Archive';
  main.replaceChildren(h('div', { className: 'wrap' }, pageHead('404', 'Esa página no existe.'), link('/', '← Volver al inicio')));
}

function go(url) {
  history.pushState(null, '', url);
  render().then(() => { window.scrollTo(0, 0); main.focus({ preventScroll: true }); });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || a.target || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || /^\/(admin|api|media)(\/|$)/.test(u.pathname)) return;
  e.preventDefault();
  go(u.pathname + u.search);
});
addEventListener('popstate', render);

// ---------- Aparición progresiva, menú móvil y pie ----------
const io = 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches
  ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 })
  : null;
function reveal() { main.querySelectorAll('.rv:not(.in)').forEach((n) => (io ? io.observe(n) : n.classList.add('in'))); }
const menu = $('#menu');
const navEl = $('#nav');
function setMenu(open) { navEl.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); }
menu.addEventListener('click', () => setMenu(!navEl.classList.contains('open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && navEl.classList.contains('open') && lb.hidden) { setMenu(false); menu.focus(); } });
const foot = $('#foot-links');
if (CONTACT.email) foot.append(h('a', { href: `mailto:${CONTACT.email}` }, CONTACT.email));
CONTACT.links.forEach((l) => foot.append(h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label)));
render();
