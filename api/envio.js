// ── GET /api/envio?cp=6300&piezas=2&valor=57400 ───────────────
// Las opciones de envío para un código postal, con el precio final.
//
// El carrito ya tiene la tabla del Sheet y muestra esos precios mientras
// se escribe, sin esperar a nadie. Esto existe para lo que la tabla no
// puede saber: la tarifa que cotiza Andreani en vivo para ese código
// postal y ese peso. Si no hay contrato cargado devuelve exactamente lo
// mismo que ya tenía el navegador.
//
// No decide nada: el precio que se cobra se vuelve a calcular al
// confirmar el pedido.

import { cotizar, cpValido } from './_envios.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  }

  const cp = String(req.query?.cp || '')
  if (!cpValido(cp)) return res.status(400).json({ ok: false, error: 'CP_INVALIDO' })

  // Son para estimar peso y valor declarado, no para cobrar: con topes,
  // así un número absurdo no se convierte en una consulta absurda.
  const piezas = Math.min(Math.max(Number.parseInt(req.query?.piezas, 10) || 1, 1), 40)
  const valorDeclarado = Math.min(Math.max(Number(req.query?.valor) || 0, 0), 5_000_000)

  try {
    const opciones = await cotizar(cp, { piezas, valorDeclarado })
    return res.status(200).json({ ok: true, opciones })
  } catch (err) {
    console.error('[envio]', err)
    return res.status(502).json({ ok: false, error: 'NO_DISPONIBLE' })
  }
}
