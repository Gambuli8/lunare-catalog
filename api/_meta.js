// ── Meta: API de conversiones ─────────────────────────────────
// Le avisa a Meta la compra desde el servidor, cuando el webhook de
// Mercado Pago confirma el pago. El píxel del navegador también la
// manda, pero en muchos celulares (iPhone sobre todo) los bloqueadores o
// la privacidad del sistema lo cortan: desde acá llega siempre.
//
// Se manda con event_id = id del pedido, el mismo que usa el píxel en la
// pantalla de vuelta de Mercado Pago, así Meta cuenta una sola compra.
//
//   VITE_META_PIXEL_ID=...      el mismo id que usa el navegador
//   META_CAPI_TOKEN=...         Administrador de eventos → el píxel →
//                               Configuración → API de conversiones
//   META_TEST_EVENT_CODE=...    opcional: para ver los eventos en
//                               "Probar eventos" sin ensuciar los datos
//
// Sin el token no se manda nada. Si Meta no contesta, se anota en los
// logs y listo: nunca frena el webhook ni el pedido.
//
// Los datos de la clienta (correo, teléfono, nombre, código postal) van
// cifrados con SHA-256, como pide Meta: no se pueden leer, solo sirven
// para que Meta reconozca a quien vio el anuncio.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { createHash } from 'node:crypto'
import { SITE_URL } from './_catalog.js'

const pixel = () => process.env.VITE_META_PIXEL_ID || ''
const token = () => process.env.META_CAPI_TOKEN || ''
// Meta da de baja cada versión de la API unos dos años después de
// sacarla: si un día deja de andar, se cambia acá sin tocar código.
const version = () => process.env.META_GRAPH_VERSION || 'v23.0'

export const capiConfigurada = () => Boolean(pixel() && token())

const sha = v => createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex')

// Meta quiere el teléfono con código de país y sin símbolos. Mismo
// criterio que el link de WhatsApp: sin 0, sin 15, con 54 9 adelante.
function telefono(t) {
  let d = String(t || '').replace(/\D/g, '')
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.startsWith('9')) d = d.slice(1)
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2')
  return d.length >= 8 && d.length <= 12 ? `549${d}` : null
}

export function eventoCompra(pedido) {
  const [nombre, ...apellido] = String(pedido.nombre || '').trim().split(/\s+/)
  const tel = telefono(pedido.telefono)
  const items = pedido.items || []

  const user_data = { country: [sha('ar')] }
  if (pedido.email) user_data.em = [sha(pedido.email)]
  if (tel) user_data.ph = [sha(tel)]
  if (nombre) user_data.fn = [sha(nombre)]
  if (apellido.length) user_data.ln = [sha(apellido.join(' '))]
  if (pedido.cp) user_data.zp = [sha(pedido.cp)]

  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: pedido.id,
    action_source: 'website',
    event_source_url: `${SITE_URL}/pago`,
    user_data,
    custom_data: {
      currency: 'ARS',
      value: Number(pedido.total),
      order_id: pedido.numero,
      content_type: 'product',
      content_ids: items.map(i => i.producto_id),
      contents: items.map(i => ({
        id: i.producto_id, quantity: i.cantidad, item_price: Number(i.precio_unitario),
      })),
      num_items: items.reduce((n, i) => n + i.cantidad, 0),
    },
  }
}

export async function avisarCompraMeta(pedido) {
  if (!capiConfigurada() || !pedido?.id) return
  try {
    const cuerpo = {
      data: [eventoCompra(pedido)],
      // Por el cuerpo y no por la URL, para que el token no quede en los
      // logs de nadie.
      access_token: token(),
    }
    if (process.env.META_TEST_EVENT_CODE) cuerpo.test_event_code = process.env.META_TEST_EVENT_CODE

    const res = await fetch(`https://graph.facebook.com/${version()}/${pixel()}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error(`[meta] la compra de ${pedido.numero} no entró: ${res.status} ${(await res.text()).slice(0, 300)}`)
      return
    }
    console.log(`[meta] compra de ${pedido.numero} avisada`)
  } catch (err) {
    console.error(`[meta] no se pudo avisar la compra de ${pedido.numero}`, err)
  }
}
