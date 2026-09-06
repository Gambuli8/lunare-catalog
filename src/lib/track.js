import { track as vercelTrack } from '@vercel/analytics'

// Eventos de negocio.
//
// Hasta ahora solo se medían visitas, así que no había forma de saber
// cuál de las 103 piezas vende ni dónde se cae la compra. Estos cuatro
// eventos alcanzan para responder eso desde el panel de Vercel.
//
// Nunca mandamos datos personales: solo código de pieza, nombre y monto.
export function track(event, data = {}) {
  try {
    vercelTrack(event, data)
  } catch {
    // Si el bloqueador de anuncios corta la analítica, la tienda sigue.
  }
}

export const trackProductView = p =>
  track('producto_visto', { id: p.id, nombre: p.name, categoria: p.category })

export const trackAddToCart = (p, qty = 1) =>
  track('agregar_al_carrito', {
    id: p.id,
    nombre: p.name,
    categoria: p.category,
    monto: (p.pricePromo ?? p.price) * qty,
  })

export const trackCheckout = (items, total) =>
  track('checkout_whatsapp', {
    piezas: items.reduce((n, i) => n + i.qty, 0),
    lineas: items.length,
    monto: total,
  })

export const trackSearch = q =>
  track('busqueda', { termino: q.slice(0, 60) })
