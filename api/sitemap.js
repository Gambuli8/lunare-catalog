// ── /api/sitemap ──────────────────────────────────────────────
// sitemap.xml generado del catálogo real: una entrada por pieza con
// stock. Cuando una pieza se agota sale del CSV y sale del sitemap.
// vercel.json manda /sitemap.xml acá.

import { getCatalog, SITE_URL } from './_catalog.js'

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))

const url = (loc, priority, changefreq) =>
  `  <url>\n    <loc>${esc(loc)}</loc>\n` +
  `    <changefreq>${changefreq}</changefreq>\n` +
  `    <priority>${priority}</priority>\n  </url>`

export default async function handler(req, res) {
  let products = []
  try {
    products = await getCatalog()
  } catch (err) {
    console.error('[sitemap]', err)
  }

  const entries = [
    url(`${SITE_URL}/`, '1.0', 'weekly'),
    url(`${SITE_URL}/tienda`, '0.9', 'daily'),
    url(`${SITE_URL}/cuidados`, '0.4', 'monthly'),
    url(`${SITE_URL}/cambios`, '0.4', 'monthly'),
    url(`${SITE_URL}/contacto`, '0.5', 'monthly'),
    ...products.map(p => url(`${SITE_URL}/producto/${p.slug}`, '0.8', 'weekly')),
  ]

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') + '\n</urlset>\n'

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(xml)
}
