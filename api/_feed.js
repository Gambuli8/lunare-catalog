// ── Feed de productos para Meta y Google ──────────────────────
// GET /feed.xml (vercel.json lo manda a /api/products?feed=xml)
//
// Es el catálogo en el formato que leen el Commerce Manager de Meta
// (para etiquetar productos en Instagram y los anuncios de catálogo) y
// el Merchant Center de Google (para aparecer gratis en Shopping). Un
// solo archivo sirve para los dos: Meta acepta el formato de Google.
//
// Lo leen solos cada tanto; no hay que subir nada. Salen únicamente las
// piezas en venta, así que una agotada desaparece del catálogo de Meta
// y de Google sola.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { SITE_URL, MATERIAL_COPY, esDeAPares } from './_catalog.js'
import { esc } from './_html.js'

// La categoría de Google para cada una de las nuestras. Con la más
// específica, Google y Meta muestran la pieza en las búsquedas justas.
const CATEGORIA_GOOGLE = {
  Argolla: 194, Pasante: 194, Abridor: 194, Cuff: 194, // Aros
  Collar: 196, Choker: 196,                              // Collares
  Dije: 192,                                             // Dijes
  Pulsera: 191,
  Anillo: 200,
  Broche: 197,
}
const JOYERIA = 188 // Ropa y accesorios > Joyería

// Meta pide 500 × 500 como mínimo, y en Instagram la foto se ve
// cuadrada: se pide recortada desde el centro, igual que en la tienda.
const foto = url =>
  url && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/f_jpg,q_auto:good,w_1080,h_1080,c_fill,g_center/')
    : url

const precio = n => `${Number(n).toFixed(2)} ARS`

// Los dos piden descripción. Mientras la dueña no la cargue en el panel,
// se arma con lo que se sabe de la pieza.
function descripcion(p) {
  const propia = String(p.description || '').replace(/\s+/g, ' ').trim()
  const armada = [
    `${p.name} — ${p.subcategory || p.category} de ${p.material.toLowerCase()}.`,
    MATERIAL_COPY[p.material],
    esDeAPares(p.category) ? 'Se vende por par.' : null,
  ].filter(Boolean).join(' ')
  return (propia ? `${propia} ${armada}` : armada).slice(0, 5000)
}

function item(p) {
  const fotos = (p.images?.length ? p.images : [p.image]).filter(Boolean)
  const titulo = [p.name, p.subcategory && p.subcategory.toLowerCase() !== p.name.toLowerCase() ? p.subcategory : null]
    .filter(Boolean).join(' · ')

  const campos = [
    ['g:id', p.id],
    ['g:title', titulo.slice(0, 150)],
    ['g:description', descripcion(p)],
    ['g:link', `${SITE_URL}/producto/${p.slug}`],
    ['g:image_link', foto(fotos[0])],
    ...fotos.slice(1, 11).map(f => ['g:additional_image_link', foto(f)]),
    ['g:availability', 'in stock'],
    ['g:price', precio(p.price)],
    ...(p.pricePromo ? [['g:sale_price', precio(p.pricePromo)]] : []),
    ['g:condition', 'new'],
    ['g:brand', 'Lunare Accesorios'],
    // Son piezas sin código de barras: sin esto, Google las rechaza por
    // falta de GTIN.
    ['g:identifier_exists', 'no'],
    ['g:google_product_category', CATEGORIA_GOOGLE[p.category] || JOYERIA],
    ['g:product_type', [p.category, p.subcategory].filter(Boolean).join(' > ')],
    ['g:material', p.material],
  ]

  return '    <item>\n' +
    campos.filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `      <${k}>${esc(v)}</${k}>`).join('\n') +
    '\n    </item>'
}

export function feedXML(productos) {
  const enVenta = productos.filter(p => p.stock > 0 && p.image && p.price > 0)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Lunare Accesorios</title>
    <link>${esc(SITE_URL)}</link>
    <description>Accesorios de plata 925, plata dorada y acero blanco.</description>
${enVenta.map(item).join('\n')}
  </channel>
</rss>
`
}
