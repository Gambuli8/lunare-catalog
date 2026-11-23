import { track as vercelTrack } from '@vercel/analytics'

// Eventos de negocio.
//
// Van a dos lugares:
//
//   - Vercel Analytics, siempre: visitas y los eventos de abajo, sin
//     cookies ni datos personales. Alcanza para saber qué piezas se miran
//     y dónde se cae la compra.
//   - El píxel de Meta, solo si está VITE_META_PIXEL_ID: es lo que le
//     dice a Meta qué anuncio terminó en una visita, un carrito o una
//     compra, para medirlos y para que optimice. Sin esa variable no se
//     carga nada de Meta.
//
// Nunca mandamos datos personales desde el navegador: solo código de
// pieza, nombre y monto. La compra con datos (cifrados) la avisa el
// servidor, ver api/_meta.js.

const PIXEL = import.meta.env.VITE_META_PIXEL_ID || ''

// Para la política de privacidad: cuando el píxel está prendido, tiene
// que decirlo.
export const metaActivo = Boolean(PIXEL)

let pixelListo = false

// El código oficial de Meta, escrito largo en vez del renglón
// minificado que dan para pegar: crea la cola de fbq y carga el script.
function iniciarPixel() {
  if (pixelListo || typeof window === 'undefined') return
  pixelListo = true
  if (!window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments)
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    if (!window._fbq) window._fbq = fbq
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(s)
  }
  window.fbq('init', PIXEL)
}

function meta(evento, datos, opciones) {
  if (!PIXEL) return
  try {
    iniciarPixel()
    if (opciones) window.fbq('track', evento, datos, opciones)
    else window.fbq('track', evento, datos)
  } catch {
    // Si un bloqueador corta el píxel, la tienda sigue.
  }
}

export function track(event, data = {}) {
  try {
    vercelTrack(event, data)
  } catch {
    // Si el bloqueador de anuncios corta la analítica, la tienda sigue.
  }
}

const precioDe = p => p.pricePromo ?? p.price
const contenidos = items => items.map(i => ({ id: i.id, quantity: i.qty, item_price: precioDe(i) }))

// Cada cambio de pantalla. La tienda es una SPA: sin esto Meta vería una
// sola visita aunque se recorran diez fichas.
export const trackPagina = () => meta('PageView')

export const trackProductView = p => {
  track('producto_visto', { id: p.id, nombre: p.name, categoria: p.category })
  meta('ViewContent', {
    content_ids: [p.id], content_type: 'product', content_name: p.name,
    content_category: p.category, value: precioDe(p), currency: 'ARS',
  })
}

export const trackAddToCart = (p, qty = 1) => {
  track('agregar_al_carrito', {
    id: p.id,
    nombre: p.name,
    categoria: p.category,
    monto: precioDe(p) * qty,
  })
  meta('AddToCart', {
    content_ids: [p.id], content_type: 'product', content_name: p.name,
    value: precioDe(p) * qty, currency: 'ARS',
  })
}

// Pasa del carrito a los datos de entrega: empezó a comprar.
export const trackInicioCompra = (items, total) => {
  track('inicio_compra', { piezas: items.reduce((n, i) => n + i.qty, 0), monto: total })
  meta('InitiateCheckout', {
    content_ids: items.map(i => i.id), contents: contenidos(items), content_type: 'product',
    num_items: items.reduce((n, i) => n + i.qty, 0), value: total, currency: 'ARS',
  })
}

// Terminó el pedido sin pagar online (WhatsApp, transferencia o
// efectivo): para Meta es un contacto con intención de compra, no una
// compra, porque todavía no se cobró.
export const trackCheckout = (items, total) => {
  track('checkout_whatsapp', {
    piezas: items.reduce((n, i) => n + i.qty, 0),
    lineas: items.length,
    monto: total,
  })
  meta('Lead', { content_ids: items.map(i => i.id), value: total, currency: 'ARS' })
}

// Volvió de Mercado Pago con el pago aprobado. El eventID es el id del
// pedido: el servidor manda la misma compra con el mismo id cuando el
// webhook la confirma, y Meta cuenta una sola.
export const trackCompra = ({ id, total }) => {
  track('compra', { monto: total })
  meta('Purchase', { value: Number(total), currency: 'ARS', content_type: 'product' }, { eventID: id })
}

export const trackSearch = q => {
  track('busqueda', { termino: q.slice(0, 60) })
  meta('Search', { search_string: q.slice(0, 60) })
}
