// Espejo de api/_envios.js para mostrar el precio mientras se escribe el
// código postal, sin ir al servidor. El precio que se cobra lo decide
// igual el servidor al confirmar: esto es solo lo que se ve.

export const cpValido = cp => /^\d{4}$/.test(String(cp || '').trim())

// Gana la fila más específica, igual que en el servidor.
export function zonaDeCp(zonas, cp) {
  if (!Array.isArray(zonas) || !cpValido(cp)) return null
  const n = Number(cp)
  return zonas
    .filter(z => n >= z.desde && n <= z.hasta)
    .sort((a, b) => (a.hasta - a.desde) - (b.hasta - b.desde))[0] || null
}

// Cuánto sale una opción de entrega para esa zona:
//   número → ese precio     0 → sin cargo
//   null   → todavía no se sabe (falta el código postal)
//   false  → esa opción no llega a esa zona
export function precioDeEnvio(entrega, zona, { gratis = false } = {}) {
  if (!entrega?.envio) return 0
  if (gratis) return 0
  if (!zona) return null
  const precio = zona[entrega.modo]
  return precio === null || precio === undefined ? false : precio
}
