// ── /api/products ─────────────────────────────────────────────
// El catálogo que consume el navegador: ya normalizado y sin la
// columna "Precio costo". La lógica vive en api/_catalog.js.

import { getCatalog } from './_catalog.js'

export default async function handler(req, res) {
  try {
    const products = await getCatalog()

    // El catálogo se edita a mano y cambia pocas veces por día: el CDN
    // sirve la copia cacheada y revalida por atrás, así una visita nunca
    // espera a Google Sheets.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600')
    return res.status(200).json({ products, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[products]', err)
    const missingConfig = /SHEET_CSV_URL/.test(err.message)
    return res
      .status(missingConfig ? 500 : 502)
      .json({ error: missingConfig ? 'Catálogo no configurado' : 'No pudimos leer el catálogo' })
  }
}
