// ── Mercado Pago ──────────────────────────────────────────────
// Checkout Pro: la preferencia se arma en el servidor con los precios
// que ya validó api/pedido.js, y la clienta se va redirigida a Mercado
// Pago. El navegador nunca decide cuánto se cobra.
//
// El pedido pasa a "pagado" únicamente por el webhook, y solo después de
// preguntarle a la API de Mercado Pago cuánto y en qué estado está el
// pago. La vuelta del navegador (back_urls) no alcanza: cualquiera puede
// escribir esa URL a mano.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { SITE_URL, formatPrice } from './_catalog.js'

const API = 'https://api.mercadopago.com'

const token = () => process.env.MP_ACCESS_TOKEN
const secreto = () => process.env.MP_WEBHOOK_SECRET

export const mpConfigurado = () => Boolean(token())

// El token de prueba empieza con TEST-. Sirve para no confundirse de
// ambiente y para avisarlo en el panel.
export const mpEsPrueba = () => String(token() || '').startsWith('TEST-')

async function mp(ruta, opciones = {}) {
  const res = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      // Por header y nunca por query param, para no dejarlo en los logs.
      Authorization: `Bearer ${token()}`,
      ...opciones.headers,
    },
    signal: AbortSignal.timeout(10000),
  })
  const texto = await res.text()
  if (!res.ok) {
    // El status va en el error para poder distinguir "no existe" de "se
    // cayó": con un 404 no tiene sentido que Mercado Pago reintente.
    const err = new Error(`Mercado Pago ${res.status}: ${texto.slice(0, 300)}`)
    err.status = res.status
    throw err
  }
  return texto ? JSON.parse(texto) : null
}

// ── Preferencia ───────────────────────────────────────────────

// El envío va como un ítem más y no como shipments.cost: así el total que
// ve la clienta en Mercado Pago coincide exactamente con el del carrito,
// sin depender de cómo Mercado Pago decida mostrar el envío.
export async function crearPreferencia({ pedido, datos, items }) {
  const lineas = items.map(i => ({
    id: i.producto_id,
    title: i.nombre,
    description: [i.material, i.subcategoria].filter(Boolean).join(' · ') || undefined,
    picture_url: i.imagen || undefined,
    category_id: 'fashion',
    quantity: i.cantidad,
    unit_price: Number(i.precio_unitario),
    currency_id: 'ARS',
  }))

  if (Number(pedido.costo_envio) > 0) {
    lineas.push({
      id: 'envio',
      title: 'Envío a domicilio',
      quantity: 1,
      unit_price: Number(pedido.costo_envio),
      currency_id: 'ARS',
    })
  }

  const [nombre, ...resto] = String(datos.nombre || '').trim().split(' ')

  const cuerpo = {
    items: lineas,
    payer: {
      name: nombre || undefined,
      surname: resto.join(' ') || undefined,
      email: datos.email || undefined,
    },
    // Con esto el webhook sabe a qué pedido corresponde el pago sin tener
    // que confiar en nada que venga del navegador.
    external_reference: pedido.id,
    statement_descriptor: 'LUNARE ACCESORIOS',
    back_urls: {
      success: `${SITE_URL}/pago?estado=exito&pedido=${encodeURIComponent(pedido.numero)}`,
      pending: `${SITE_URL}/pago?estado=pendiente&pedido=${encodeURIComponent(pedido.numero)}`,
      failure: `${SITE_URL}/pago?estado=error&pedido=${encodeURIComponent(pedido.numero)}`,
    },
    auto_return: 'approved',
    notification_url: `${SITE_URL}/api/mp-webhook`,
    // Si no paga en 24 horas, la preferencia vence y el pedido se puede
    // cancelar a mano para liberar el stock.
    expires: true,
    expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    metadata: { pedido_numero: pedido.numero },
  }

  const pref = await mp('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(cuerpo),
  })

  return {
    id: pref.id,
    // init_point es el de producción; con credenciales de prueba Mercado
    // Pago igual devuelve el correcto para ese ambiente.
    url: pref.init_point || pref.sandbox_init_point,
  }
}

export const consultarPago = id => mp(`/v1/payments/${encodeURIComponent(id)}`)

// ── Firma del webhook ─────────────────────────────────────────
// Sin esto, cualquiera que sepa la URL puede mandar un POST diciendo que
// un pedido está pago. Es la parte que no se puede saltear.
//
// Mercado Pago manda:
//   x-signature: ts=1704908010,v1=<hmac hex>
//   x-request-id: <uuid>
// y el manifest es  id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// firmado con HMAC-SHA256 usando la clave secreta de la aplicación.

export const firmaConfigurada = () => Boolean(secreto())

function comparar(a, b) {
  const x = Buffer.from(String(a), 'utf8')
  const y = Buffer.from(String(b), 'utf8')
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}

export function firmaValida({ xSignature, xRequestId, dataId }) {
  if (!secreto()) return { ok: false, motivo: 'SIN_SECRETO' }
  if (!xSignature) return { ok: false, motivo: 'SIN_FIRMA' }

  let ts = null
  let v1 = null
  for (const parte of String(xSignature).split(',')) {
    const i = parte.indexOf('=')
    if (i === -1) continue
    const clave = parte.slice(0, i).trim()
    const valor = parte.slice(i + 1).trim()
    if (clave === 'ts') ts = valor
    if (clave === 'v1') v1 = valor
  }
  if (!ts || !v1) return { ok: false, motivo: 'FIRMA_INCOMPLETA' }

  // La doc dice que hay que sacar del manifest los valores que no vengan,
  // y pasar el id a minúsculas si trae mayúsculas.
  let manifest = ''
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  const esperado = createHmac('sha256', secreto()).update(manifest).digest('hex')
  if (!comparar(esperado, v1)) return { ok: false, motivo: 'FIRMA_NO_COINCIDE' }

  // Una notificación vieja reenviada es sospechosa. La ventana es amplia
  // porque Mercado Pago reintenta durante un rato.
  const edadMin = (Date.now() - Number(ts)) / 60000
  if (Number.isFinite(edadMin) && Math.abs(edadMin) > 30) {
    return { ok: false, motivo: 'FIRMA_VENCIDA' }
  }

  return { ok: true }
}

// Lo que se muestra en el mail y en el panel.
export const resumenPago = pago => ({
  id: String(pago?.id ?? ''),
  estado: pago?.status ?? '',
  detalle: pago?.status_detail ?? '',
  monto: Number(pago?.transaction_amount ?? 0),
  monto_texto: formatPrice(Number(pago?.transaction_amount ?? 0)),
  medio: pago?.payment_method_id ?? '',
  cuotas: pago?.installments ?? null,
  pedido_id: pago?.external_reference ?? null,
})
