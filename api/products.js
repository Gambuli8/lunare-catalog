// ── /api/products ─────────────────────────────────────────────
// El catálogo que consume el navegador: ya normalizado y sin la
// columna "Precio costo". La lógica vive en api/_catalog.js.

import { getCatalog } from './_catalog.js'
import { ENTREGAS, PAGOS, ENVIO_GRATIS_DESDE, pedidosConfigurados } from './_pedidos.js'

export default async function handler(req, res) {
  try {
    const products = await getCatalog()

    // El catálogo se edita a mano y cambia pocas veces por día: el CDN
    // sirve la copia cacheada y revalida por atrás, así una visita nunca
    // espera a Google Sheets.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600')
    return res.status(200).json({
      products,
      updatedAt: new Date().toISOString(),
      // Las opciones de entrega y pago viajan con el catálogo para que la
      // vidriera muestre exactamente lo que va a cobrar el servidor. Si
      // estuvieran duplicadas en el cliente, tarde o temprano se separan.
      checkout: {
        activo: pedidosConfigurados(),
        envioGratisDesde: ENVIO_GRATIS_DESDE,
        entregas: Object.entries(ENTREGAS).map(([key, e]) => ({
          key, etiqueta: e.etiqueta, costo: e.costo, envio: e.envio,
        })),
        pagos: Object.entries(PAGOS).map(([key, p]) => ({
          key, etiqueta: p.etiqueta, soloRetiro: !!p.soloRetiro,
        })),
      },
    })
  } catch (err) {
    console.error('[products]', err)
    const missingConfig = /SHEET_CSV_URL/.test(err.message)
    return res
      .status(missingConfig ? 500 : 502)
      .json({ error: missingConfig ? 'Catálogo no configurado' : 'No pudimos leer el catálogo' })
  }
}
