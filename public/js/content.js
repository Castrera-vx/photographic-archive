// Contenido editable del portafolio. Deja '' (o []) lo que no quieras mostrar:
// las secciones que dependen de un dato vacío (contacto, nombre) se ocultan solas.
export const PROFILE = { name: '--', role: '--' }; // p. ej. { name: 'Tu nombre', role: 'Fotógrafo' }
export const CONTACT = { email: '--', links: [] }; // links: [{ label: 'Instagram', url: 'https://...' }]

export const HEADLINE = ['Photo', 'Book', 'archive'];
export const INTRO_TITLE = ['Fotografías', 'Del Photobook', 'archivadas'];
export const INTRO = 'Un archivo de fotografías tomadas durante la creacion de este proyecto: calles, lugares y luz que valió la pena conservar.';
export const VISION = [
  { title: 'Mirar', text: 'Cada fotografía conserva su fecha, los datos técnicos con los que fue tomada.' },
  { title: 'Archivar', text: 'Las colecciones agrupan series y proyectos; las categorías ordenan el archivo completo.' },
];
export const ABOUT = [
  'No es un portafolio comercial ni un escaparate: es el lugar donde se conserva, ordena y comparte las fotografías tomadas durante la creacion del photobook y que no terminaron en el proyecto final.',
  'Cada imagen conserva su fecha, los datos técnicos con los que fue tomada. Las colecciones agrupan series y proyectos; las categorías ordenan el archivo completo.',
  'Las fotografías se publican en versiones optimizadas y sin datos de ubicación GPS.',
];
