// ── GET /api/cron-vencidos ────────────────────────────────────
// Cancela los pedidos de Mercado Pago que nadie pagó, para que las
// piezas vuelvan a estar a la venta. Lo llama el cron de Vercel (ver
// "crons" en vercel.json), no una persona.
//
// Antes un pedido sin pagar quedaba en "pendiente" reteniendo stock hasta
// que alguien lo cancelara a mano desde el panel.
//
// Solo toca pedidos que cumplen todo esto:
//   - están en "pendiente" y se eligió pagar con Mercado Pago
//     (transferencia y efectivo se coordinan a mano y no se tocan)
//   - tienen más de VENCE_HORAS: la preferencia vence a las 24 h, y el
//     margen es para el que pagó en el último minuto
//   - Mercado Pago confirma que no tienen ningún pago aprobado ni en
//     curso. Un pago en efectivo (Rapipago, Pago Fácil) puede quedar
//     "pending" varios días después de que vence la preferencia: ese
//     pedido no se cancela.
//
// Ante cualquier duda —Mercado Pago no contesta, un pago aprobado que el
// webhook no registró— el pedido NO se cancela y queda en los logs para
// mirarlo a mano. Cancelar de más es peor que cancelar de menos.

import { timingSafeEqual } from 'node:crypto'
import { rpc, supabaseConfigurado } from './_supabase.js'
import { mpConfigurado, pagosDelPedido } from './_mp.js'

const VENCE_HORAS = 25
const VIVOS = ['approved', 'authorized', 'pending', 'in_process', 'in_mediation']

// Vercel manda "Authorization: Bearer <CRON_SECRET>" en cada llamada del
// cron. Sin el secreto configurado no se corre: si no, cualquiera que
// sepa la URL podría disparar cancelaciones.
function autorizado(req) {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false
  const x = Buffer.from(String(req.headers?.authorization || ''))
  const y = Buffer.from(`Bearer ${secreto}`)
  return x.length === y.length && timingSafeEqual(x, y)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!process.env.CRON_SECRET) {
    console.error('[cron-vencidos] falta CRON_SECRET')
    return res.status(503).json({ ok: false, error: 'SIN_SECRETO' })
  }
  if (!autorizado(req)) return res.status(401).json({ ok: false, error: 'NO_AUTORIZADO' })
  if (!supabaseConfigurado() || !mpConfigurado()) {
    // Sin el token de Mercado Pago no hay cómo confirmar que un pedido no
    // se pagó, y sin eso no se cancela nada.
    console.error('[cron-vencidos] faltan las variables de Supabase o MP_ACCESS_TOKEN')
    return res.status(503).json({ ok: false, error: 'NO_CONFIGURADO' })
  }

  let pendientes
  try {
    pendientes = await rpc('listar_pedidos', { p_estado: 'pendiente', p_limite: 200 })
  } catch (err) {
    console.error('[cron-vencidos] no se pudieron leer los pedidos', err)
    return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_LEER' })
  }

  const limite = Date.now() - VENCE_HORAS * 60 * 60 * 1000
  const vencidos = (pendientes || []).filter(p =>
    p.pago === 'mercadopago' && Date.parse(p.creado_en) < limite
  )

  const cancelados = []
  const salteados = []

  for (const p of vencidos) {
    let pagos
    try {
      pagos = await pagosDelPedido(p.id)
    } catch (err) {
      console.error(`[cron-vencidos] no se pudo consultar Mercado Pago por ${p.numero}`, err)
      salteados.push({ numero: p.numero, motivo: 'MP_NO_RESPONDE' })
      continue
    }

    const vivo = pagos.find(pg => VIVOS.includes(pg?.status))
    if (vivo) {
      // Aprobado y todavía pendiente acá = el webhook no llegó o falló.
      // Se deja para revisar: el cobro existe y no hay que cancelarlo.
      const log = vivo.status === 'approved' ? console.error : console.log
      log(`[cron-vencidos] ${p.numero} tiene el pago ${vivo.id} en ${vivo.status}: no se cancela`)
      salteados.push({ numero: p.numero, motivo: `PAGO_${String(vivo.status).toUpperCase()}` })
      continue
    }

    try {
      const r = await rpc('cambiar_estado_pedido', { p_id: p.id, p_estado: 'cancelado' })
      if (!r?.ok) throw new Error(JSON.stringify(r))
      cancelados.push(p.numero)
    } catch (err) {
      console.error(`[cron-vencidos] no se pudo cancelar ${p.numero}`, err)
      salteados.push({ numero: p.numero, motivo: 'NO_SE_PUDO_CANCELAR' })
    }
  }

  console.log(
    `[cron-vencidos] ${vencidos.length} vencidos: ${cancelados.length} cancelados` +
    (cancelados.length ? ` (${cancelados.join(', ')})` : '') +
    `, ${salteados.length} salteados`
  )
  return res.status(200).json({ ok: true, cancelados, salteados })
}
