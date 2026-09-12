// ── POST /api/mp-webhook ──────────────────────────────────────
// Donde Mercado Pago avisa que pasó algo con un pago.
//
// Tres reglas que no se negocian:
//
//  1. Se verifica la firma. Sin eso, cualquiera que sepa la URL manda un
//     POST y se lleva las piezas sin pagar.
//  2. No se le cree nada al cuerpo de la notificación más allá del id.
//     El estado y el monto se le preguntan a la API de Mercado Pago.
//  3. Se compara el monto contra el total del pedido antes de darlo por
//     pagado.
//
// Y una de convivencia: a Mercado Pago hay que contestarle 200 rápido.
// Si devolvemos error, reintenta; así que solo devolvemos error cuando
// queremos que reintente de verdad.

import { waitUntil } from '@vercel/functions'
import { rpc, supabaseConfigurado } from './_supabase.js'
import { firmaValida, firmaConfigurada, consultarPago, mpConfigurado, resumenPago } from './_mp.js'
import { avisarPagoAprobado } from './_aviso.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  }
  if (!mpConfigurado() || !supabaseConfigurado()) {
    console.error('[mp-webhook] faltan MP_ACCESS_TOKEN o las variables de Supabase')
    return res.status(503).json({ ok: false, error: 'NO_CONFIGURADO' })
  }
  // Sin secreto no hay forma de saber si la notificación es real. Antes
  // que creerle a cualquiera, no procesamos nada.
  if (!firmaConfigurada()) {
    console.error('[mp-webhook] falta MP_WEBHOOK_SECRET: no se puede validar la firma')
    return res.status(503).json({ ok: false, error: 'SIN_SECRETO' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }

  // El manifest de la firma usa el data.id de los query params.
  const dataId = req.query?.['data.id'] || req.query?.id || body?.data?.id
  const firma = firmaValida({
    xSignature: req.headers['x-signature'],
    xRequestId: req.headers['x-request-id'],
    dataId,
  })
  if (!firma.ok) {
    console.warn(`[mp-webhook] firma rechazada (${firma.motivo})`)
    return res.status(401).json({ ok: false, error: 'FIRMA_INVALIDA' })
  }

  const tipo = String(req.query?.type || body?.type || '')
  const accion = String(body?.action || '')

  // Mercado Pago manda varios tipos de evento. Los que no son de un pago
  // se aceptan y se ignoran: contestar 200 hace que deje de reintentar.
  if (tipo !== 'payment' && !accion.startsWith('payment.')) {
    return res.status(200).json({ ok: true, ignorado: tipo || accion || 'sin tipo' })
  }
  if (!dataId) {
    return res.status(200).json({ ok: true, ignorado: 'sin data.id' })
  }

  let pago
  try {
    pago = await consultarPago(dataId)
  } catch (err) {
    // Si el pago no existe, reintentar no lo va a hacer aparecer: se
    // acepta y se ignora, o Mercado Pago reintenta para siempre.
    if (err?.status === 404) {
      console.warn(`[mp-webhook] el pago ${dataId} no existe en Mercado Pago`)
      return res.status(200).json({ ok: true, ignorado: 'el pago no existe' })
    }
    // Lo demás sí puede ser un corte momentáneo: que reintente.
    console.error('[mp-webhook] no se pudo consultar el pago', err)
    return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_CONSULTAR' })
  }

  const r = resumenPago(pago)

  if (r.estado !== 'approved') {
    console.log(`[mp-webhook] pago ${r.id} en estado ${r.estado} (${r.detalle}); no se toca el pedido`)
    return res.status(200).json({ ok: true, estado: r.estado, cambiado: false })
  }
  if (!r.pedido_id) {
    console.warn(`[mp-webhook] pago ${r.id} aprobado pero sin external_reference`)
    return res.status(200).json({ ok: true, ignorado: 'sin external_reference' })
  }

  let pedido
  try {
    pedido = await rpc('pedido_por_id', { p_pedido_id: r.pedido_id })
  } catch (err) {
    console.error('[mp-webhook] no se pudo leer el pedido', err)
    return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_LEER' })
  }
  if (!pedido) {
    console.warn(`[mp-webhook] pago ${r.id} apunta al pedido ${r.pedido_id}, que no existe`)
    return res.status(200).json({ ok: true, ignorado: 'pedido inexistente' })
  }

  // Que el monto cobrado alcance para el total del pedido. Si no cierra,
  // no lo damos por pagado y queda para mirar a mano.
  const total = Number(pedido.total)
  if (!(r.monto + 0.5 >= total)) {
    console.error(
      `[mp-webhook] el pago ${r.id} es de ${r.monto} y el pedido ${pedido.numero} es de ${total}: no coincide`
    )
    return res.status(200).json({ ok: true, ignorado: 'monto no coincide' })
  }

  let cambio
  try {
    cambio = await rpc('marcar_pedido_pagado', { p_pedido_id: r.pedido_id, p_payment_id: r.id })
  } catch (err) {
    console.error('[mp-webhook] no se pudo marcar el pedido', err)
    return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_MARCAR' })
  }

  console.log(
    `[mp-webhook] pago ${r.id} aprobado por ${r.monto_texto} → ${pedido.numero}` +
    (cambio?.cambiado ? ' (pasa a pagado)' : ` (sin cambio: ${cambio?.motivo || 'ya estaba'})`)
  )

  // El mail solo la primera vez: Mercado Pago manda varios eventos por el
  // mismo pago y nadie quiere seis mails del mismo pedido.
  if (cambio?.cambiado) {
    const aviso = avisarPagoAprobado({ pedido, pago: r })
    try { waitUntil(aviso) } catch { await aviso }
  }

  return res.status(200).json({ ok: true, cambiado: Boolean(cambio?.cambiado) })
}
