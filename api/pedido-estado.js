// ── GET /api/pedido-estado?id=<uuid> ──────────────────────────
// Le dice al navegador si un pedido sigue esperando el pago, para no
// recordarle que pague a alguien que ya pagó.
//
// Se pide por el id (un uuid que solo conoce quien hizo el pedido) y no
// por el número, que es correlativo y se adivina. Y devuelve únicamente
// el número y el estado: nada de nombre, teléfono ni dirección.

import { rpc, supabaseConfigurado } from './_supabase.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  }
  if (!supabaseConfigurado()) {
    return res.status(503).json({ ok: false, error: 'PEDIDOS_NO_CONFIGURADOS' })
  }

  const id = String(req.query?.id || '')
  if (!UUID.test(id)) return res.status(400).json({ ok: false, error: 'ID_INVALIDO' })

  try {
    const pedido = await rpc('pedido_por_id', { p_pedido_id: id })
    if (!pedido) return res.status(404).json({ ok: false, error: 'NO_EXISTE' })
    return res.status(200).json({ ok: true, numero: pedido.numero, estado: pedido.estado })
  } catch (err) {
    console.error('[pedido-estado]', err)
    return res.status(502).json({ ok: false, error: 'NO_DISPONIBLE' })
  }
}
