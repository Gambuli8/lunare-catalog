// ── /api/shop ─────────────────────────────────────────────────
// Sirve /tienda y /tienda/:categoria con título, meta y datos
// estructurados propios. Cada categoría es una página indexable más:
// "argollas de plata" es una búsqueda que hoy no lleva a ningún lado.
//
// vercel.json manda /tienda y /tienda/:cat a esta función.

import { getCatalog, categoryFromSlug, categoryLabel, categorySlug, SITE_URL, formatPrice, ogImage } from './_catalog.js'
import { esc, loadShell, inject, notFound } from './_html.js'

const MATERIAL_ORDER = ['Plata', 'Plata Dorada', 'Acero Blanco', 'Bijou']

function materialsPhrase(products) {
  const present = MATERIAL_ORDER.filter(m => products.some(p => p.material === m))
  const nice = present.map(m => m === 'Plata' ? 'plata 925' : m.toLowerCase())
  if (nice.length <= 1) return nice[0] || ''
  return nice.slice(0, -1).join(', ') + ' y ' + nice[nice.length - 1]
}

// ItemList le dice a Google qué piezas hay en la página y en qué orden.
function itemList(products, url) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'ItemList',
    url,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 30).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/producto/${p.slug}`,
      name: p.name,
    })),
  }
}

function breadcrumbs(category, url) {
  const items = [{ name: 'Inicio', item: SITE_URL + '/' }, { name: 'Tienda', item: SITE_URL + '/tienda' }]
  if (category) items.push({ name: categoryLabel(category), item: url })
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.item,
    })),
  }
}

export default async function handler(req, res) {
  const slug = String(req.query.cat || '').trim()

  let shell
  try {
    shell = await loadShell(req)
  } catch (err) {
    console.error('[shop] no se pudo leer el shell', err)
    return res.status(500).send('No pudimos cargar la página')
  }

  let all = []
  try {
    all = await getCatalog()
  } catch (err) {
    console.error('[shop]', err)
  }

  const category = slug ? categoryFromSlug(slug, all) : null
  if (slug && !category) {
    return notFound(res, shell, 'Categoría no encontrada · Lunare Accesorios')
  }

  const products = category ? all.filter(p => p.category === category) : all
  const label = category ? categoryLabel(category) : 'Tienda'
  const url = category ? `${SITE_URL}/tienda/${categorySlug(category)}` : `${SITE_URL}/tienda`
  const materiales = materialsPhrase(products)

  const title = category
    ? `${label} de ${materiales} — ${products.length} piezas | Lunare Accesorios`
    : `Tienda — ${all.length} piezas de plata 925 y acero blanco | Lunare Accesorios`

  const desc = category
    ? `${products.length} ${label.toLowerCase()} de ${materiales} con stock. ` +
      `Retiro sin cargo en Santa Rosa (La Pampa) y Nueva Córdoba. Lunare Accesorios.`
    : `Argollas, collares, pulseras y dijes de plata de ley 925, plata dorada y acero blanco. ` +
      `${all.length} piezas con stock. Retiro en Santa Rosa (La Pampa) y Nueva Córdoba.`

  // La foto de la primera pieza representa la categoría al compartir.
  const cover = products.find(p => p.image)
  const img = cover ? ogImage(cover.image) : `${SITE_URL}/og-default.jpg`

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Lunare Accesorios">`,
    `<meta property="og:locale" content="es_AR">`,
    `<meta property="og:title" content="${esc(label + ' · Lunare Accesorios')}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(itemList(products, url))}</script>`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumbs(category, url))}</script>`,
  ]

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600')
  return res.status(200).send(inject(shell, tags))
}
