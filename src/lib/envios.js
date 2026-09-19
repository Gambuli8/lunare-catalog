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

// ── Dónde se rastrea cada transporte ──────────────────────────
// Los tres usan páginas hechas en JavaScript: un link con el número
// adentro no es confiable, así que se manda el link a la página de
// rastreo y el número bien visible para pegarlo ahí.
//
// Verificado que las tres responden. Si mañana se agrega un transporte
// en el Sheet y no está acá, el aviso sale igual, solo sin botón.
const SEGUIMIENTO = [
  [/andreani/i, 'https://www.andreani.com/?tab=seguir-envio'],
  [/correo\s*argentino|oca|paq\.?ar/i, 'https://www.correoargentino.com.ar/seguimiento-de-envios'],
  [/integral\s*pack/i, 'https://www.integralpack.com.ar/seguimiento'],
]

export function linkSeguimiento(transporte) {
  const nombre = String(transporte || '')
  for (const [patron, url] of SEGUIMIENTO) if (patron.test(nombre)) return url
  return null
}
