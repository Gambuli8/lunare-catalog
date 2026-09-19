// ── Pago pendiente ────────────────────────────────────────────
// Cuando alguien sale a pagar a Mercado Pago, el pedido ya está guardado
// y las piezas reservadas. Si vuelve sin pagar —tocó "atrás", dudó, se le
// cortó—, sin esto encuentra el carrito vacío y ninguna pista de que su
// pedido sigue esperando.
//
// Se guarda en el navegador lo mínimo para retomarlo: el id del pedido
// (para preguntarle al servidor si ya se pagó), el número, el total y el
// link de pago. Vence junto con la preferencia de Mercado Pago.

const CLAVE = 'lunare_pago_pendiente'
const POSPUESTO = 'lunare_pago_pospuesto'
const VIGENCIA = 24 * 60 * 60 * 1000

export function guardarPagoPendiente({ id, numero, total, url }) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ id, numero, total, url, creado: Date.now() }))
    sessionStorage.removeItem(POSPUESTO)
  } catch { /* sin storage no hay recordatorio, la compra sigue igual */ }
}

export function leerPagoPendiente() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) || 'null')
    if (!p?.id || !p?.url) return null
    if (Date.now() - p.creado > VIGENCIA) {
      localStorage.removeItem(CLAVE)
      return null
    }
    return p
  } catch {
    return null
  }
}

export function borrarPagoPendiente() {
  try {
    localStorage.removeItem(CLAVE)
    sessionStorage.removeItem(POSPUESTO)
  } catch { /* nada que borrar */ }
}

// "Ahora no" lo calla hasta que cierre el navegador; la próxima visita
// se lo volvemos a recordar mientras la reserva siga vigente.
export function posponerPagoPendiente(numero) {
  try { sessionStorage.setItem(POSPUESTO, numero) } catch { /* ídem */ }
}

export function estaPospuesto(numero) {
  try { return sessionStorage.getItem(POSPUESTO) === numero } catch { return false }
}
