// ── /api/page ─────────────────────────────────────────────────
// Sirve el HTML de una ficha de producto con sus propios <title>,
// meta de compartir y datos estructurados.
//
// Por qué hace falta: la tienda es una SPA. WhatsApp, Instagram y el
// robot de Google no ejecutan JavaScript, así que si las etiquetas se
// escribieran desde React verían el HTML vacío. Acá el HTML ya sale
// armado; React toma el control después, en el navegador.
//
// vercel.json manda /producto/:slug a esta función.

import { getCatalog, SITE_URL, formatPrice, ogImage } from './_catalog.js'
import { esc, loadShell, inject, notFound } from './_html.js'

const MATERIAL_COPY = {
  'Plata': 'Plata de ley 925, con 92,5 % de plata pura.',
  'Plata Dorada': 'Plata de ley 925 con baño de oro.',
  'Acero Blanco': 'Acero quirúrgico con baño blanco, resistente e hipoalergénico.',
  'Bijou': 'Accesorio de bijouterie de alta calidad.',
}

function description(p) {
  const venta = p.priceNote === 'par' ? 'Se vende por par.' : 'Se vende por unidad.'
  const material = MATERIAL_COPY[p.material] || ''
  return `${p.name} — ${p.subcategory || p.category} de ${p.material.toLowerCase()}. ` +
    `${material} ${venta} ${formatPrice(p.pricePromo || p.price)} en Lunare Accesorios.`
}

// Schema.org Product: es lo que hace que Google muestre precio y
// disponibilidad en los resultados.
function jsonLd(p, url) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.name,
    sku: p.id,
    description: description(p),
    image: p.image ? [ogImage(p.image)] : undefined,
    category: p.category,
    material: p.material,
    brand: { '@type': 'Brand', name: 'Lunare Accesorios' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'ARS',
      price: String(p.pricePromo || p.price),
      availability: p.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Lunare Accesorios' },
    },
  }
}

function breadcrumbs(p, url) {
  const items = [
    { name: 'Inicio', item: SITE_URL + '/' },
    { name: 'Tienda', item: SITE_URL + '/tienda' },
    { name: p.name, item: url },
  ]
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.item,
    })),
  }
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').trim()

  let shell
  try {
    shell = await loadShell(req)
  } catch (err) {
    console.error('[page] no se pudo leer el shell', err)
    return res.status(500).send('No pudimos cargar la página')
  }

  let product = null
  try {
    product = (await getCatalog()).find(p => p.slug === slug) || null
  } catch (err) {
    console.error('[page]', err)
  }

  // Sin stock o slug inexistente: que el cliente muestre su propio
  // mensaje, pero sin que Google lo indexe.
  if (!product) return notFound(res, shell, 'Pieza no encontrada · Lunare Accesorios')

  const url = `${SITE_URL}/producto/${product.slug}`
  const title = `${product.name} · ${product.subcategory || product.category} de ${product.material} | Lunare`
  const desc = description(product)
  const img = product.image ? ogImage(product.image) : `${SITE_URL}/og-default.jpg`

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:site_name" content="Lunare Accesorios">`,
    `<meta property="og:locale" content="es_AR">`,
    `<meta property="og:title" content="${esc(product.name + ' · ' + formatPrice(product.pricePromo || product.price))}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(product.name)}">`,
    `<meta property="product:price:amount" content="${product.pricePromo || product.price}">`,
    `<meta property="product:price:currency" content="ARS">`,
    `<meta property="product:availability" content="in stock">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd(product, url))}</script>`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumbs(product, url))}</script>`,
    // El cliente lee esto y pinta la ficha sin esperar al fetch del catálogo.
    `<script>window.__PRODUCT__=${JSON.stringify(product).replace(/</g, '\\u003c')}</script>`,
  ]

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600')
  return res.status(200).send(inject(shell, tags))
}
