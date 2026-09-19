// Espejo de api/_envios.js para mostrar las opciones de envío mientras se
// escribe el código postal, sin ir al servidor. Lo que se cobra lo decide
// igual el servidor al confirmar: esto es solo lo que se ve.

export const MODOS = {
  domicilio: { etiqueta: 'A domicilio', entrega: 'envio' },
  sucursal: { etiqueta: 'A sucursal', entrega: 'envio_sucursal' },
}

export const cpValido = cp => /^\d{4}$/.test(String(cp || '').trim())

// De la más barata a la más cara. Para cada transporte y modalidad gana
// la fila más específica, igual que en el servidor.
export function opcionesDeEnvio(zonas, cp) {
  if (!Array.isArray(zonas) || !cpValido(cp)) return []
  const n = Number(cp)

  const candidatas = zonas
    .filter(z => n >= z.desde && n <= z.hasta)
    .sort((a, b) => (a.hasta - a.desde) - (b.hasta - b.desde))

  const vistas = new Set()
  const opciones = []

  for (const z of candidatas) {
    for (const modo of Object.keys(MODOS)) {
      const costo = z[modo]
      if (costo === null || costo === undefined) continue

      const id = `${z.transporte}|${modo}`
      if (vistas.has(id)) continue
      vistas.add(id)

      opciones.push({
        id,
        transporte: z.transporte,
        modo,
        entrega: MODOS[modo].entrega,
        costo,
        dias: z.dias,
        zona: z.zona,
      })
    }
  }

  return opciones.sort((a, b) => a.costo - b.costo)
}
