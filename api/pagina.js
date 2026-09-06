// ── /api/pagina ───────────────────────────────────────────────
// Sirve /cuidados, /cambios y /contacto con título, descripción y
// canonical propios.
//
// Antes eran anclas de la home: las tres devolvían el mismo HTML, con el
// canonical apuntando a "/". Google las trataba como duplicados, aunque
// estuvieran en el sitemap.
//
// vercel.json manda esas tres rutas acá.

import { SITE_URL } from './_catalog.js'
import { esc, loadShell, inject, notFound } from './_html.js'

const PAGINAS = {
  cuidados: {
    ruta: '/cuidados',
    title: 'Cómo cuidar tus joyas de plata 925 y acero blanco | Lunare Accesorios',
    desc: 'Cómo guardar, limpiar y conservar tus accesorios de plata de ley 925, ' +
      'plata dorada y acero blanco para que duren. Guía de Lunare Accesorios.',
  },
  cambios: {
    ruta: '/cambios',
    title: 'Cambios y devoluciones | Lunare Accesorios',
    desc: 'Podés cambiar dentro de los 10 días corridos, sin uso y en las mismas ' +
      'condiciones. Por higiene, los aros y cuffs a presión no tienen cambio.',
  },
  contacto: {
    ruta: '/contacto',
    title: 'Contacto y preguntas frecuentes | Lunare Accesorios',
    desc: 'Escribinos por WhatsApp al +54 2954 476558 o seguinos en Instagram ' +
      '@lunare.acc. Retiro coordinado en Santa Rosa (La Pampa) y Nueva Córdoba.',
  },
}

// Las FAQ como datos estructurados: es lo que le permite a Google mostrar
// las preguntas desplegables en los resultados.
const FAQ = [
  ['¿Hacen envíos a todo el país?',
   'Por el momento no. Podés retirar tu pedido coordinando previamente en Santa Rosa (La Pampa) o en Nueva Córdoba.'],
  ['¿Los accesorios se oxidan?',
   'Están hechos con materiales de buena calidad, pero conviene evitar el contacto con agua, perfumes o cremas para prolongar su duración.'],
  ['¿Puedo cambiar una pieza si no me queda bien?',
   'Sí, dentro de los 10 días corridos y siempre que esté sin uso. Por higiene, los aros y cuffs a presión no se cambian.'],
  ['¿Los productos tienen stock?',
   'Sí. Todo lo que aparece en la web tiene stock listo para comprar: las piezas agotadas se sacan del catálogo automáticamente.'],
  ['¿Cómo se coordina el pago?',
   'Una vez que hacés el pedido por WhatsApp coordinamos el método: transferencia bancaria, Mercado Pago o efectivo al retirar.'],
]

const faqJsonLd = () => ({
  '@context': 'https://schema.org/',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
})

const breadcrumbs = p => ({
  '@context': 'https://schema.org/',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL + '/' },
    { '@type': 'ListItem', position: 2, name: p.title.split(' | ')[0], item: SITE_URL + p.ruta },
  ],
})

export default async function handler(req, res) {
  const clave = String(req.query.pagina || '').trim()
  const p = PAGINAS[clave]

  let shell
  try {
    shell = await loadShell(req)
  } catch (err) {
    console.error('[pagina] no se pudo leer el shell', err)
    return res.status(500).send('No pudimos cargar la página')
  }

  if (!p) return notFound(res, shell, 'Página no encontrada · Lunare Accesorios')

  const url = SITE_URL + p.ruta
  const tags = [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Lunare Accesorios">`,
    `<meta property="og:locale" content="es_AR">`,
    `<meta property="og:title" content="${esc(p.title.split(' | ')[0])}">`,
    `<meta property="og:description" content="${esc(p.desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumbs(p))}</script>`,
  ]
  if (clave === 'contacto') {
    tags.push(`<script type="application/ld+json">${JSON.stringify(faqJsonLd())}</script>`)
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(inject(shell, tags))
}
