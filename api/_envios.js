// ── Tarifas de envío ──────────────────────────────────────────
// Salen de una pestaña del mismo Google Sheet del catálogo, para que las
// pueda cambiar Lunare cuando aumenta el correo, sin tocar código ni
// esperar un deploy.
//
// La pestaña se llama "Envios" y va una fila por transporte y por zona:
//
//   Transporte       | Zona           | CP desde | CP hasta | Domicilio | Sucursal | Dias
//   Andreani         | Santa Rosa     | 6300     | 6399     | 4200      | 3500     | 1 a 2
//   Correo Argentino | Santa Rosa     | 6300     | 6399     | 3900      | 3100     | 2 a 3
//   Integral Pack    | Santa Rosa     | 6300     | 6399     | 3500      |          | 1
//   Andreani         | Resto del país | 1000     | 9999     | 12500     | 9900     | 5 a 8
//
// La clienta escribe su código postal y elige entre las opciones que le
// llegan, con el precio de cada una.
//
// Gana la fila más específica: si el CP entra en dos zonas, para ese
// transporte manda la del rango más chico. Así una fila puntual para
// Santa Rosa le gana a la fila general del país sin ordenar nada a mano.
//
// Una celda vacía en Domicilio o Sucursal significa que ese transporte no
// ofrece esa modalidad en esa zona, y esa opción no se muestra.
//
// Sin SHEET_ENVIOS_CSV_URL se usa la tarifa de abajo y la tienda funciona
// igual que antes, con una sola opción de envío.
//
// Andreani y Correo Argentino pueden cotizar en vivo si están sus
// credenciales cargadas: ver _andreani.js y _micorreo.js. Sin ellas, el
// precio sale del Sheet y la pantalla es la misma.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { parseCSV } from './_catalog.js'
import { aplicarTarifas as tarifasAndreani } from './_andreani.js'
import { aplicarTarifas as tarifasMiCorreo } from './_micorreo.js'

const csvUrl = () => process.env.SHEET_ENVIOS_CSV_URL
const TTL = 5 * 60 * 1000

export const MODOS = {
  domicilio: { etiqueta: 'A domicilio', entrega: 'envio' },
  sucursal: { etiqueta: 'A sucursal', entrega: 'envio_sucursal' },
}

// Provisoria, hasta que exista la pestaña: un solo precio para todo el
// país, que es lo que había antes de separar por zona y transporte.
export const ZONAS_POR_DEFECTO = [
  {
    transporte: 'A coordinar',
    zona: 'Todo el país',
    desde: 1000, hasta: 9999,
    domicilio: 6800, sucursal: null,
    dias: '',
  },
]

const aNumero = v => {
  // Viene del Sheet: puede traer "$", puntos de miles y coma decimal.
  const limpio = String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  if (!limpio) return null
  const n = Number.parseFloat(limpio)
  return Number.isFinite(n) ? n : null
}

// Los encabezados los escribe una persona: pueden venir con acento, en
// mayúsculas o con espacios de más.
const clave = h => String(h || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '')

function normalizarFilas(filas) {
  const zonas = []

  for (const cruda of filas) {
    const fila = {}
    for (const [h, v] of Object.entries(cruda)) fila[clave(h)] = v

    const desde = aNumero(fila.cpdesde)
    const hasta = aNumero(fila.cphasta)
    const domicilio = aNumero(fila.domicilio)
    const sucursal = aNumero(fila.sucursal)

    // Sin rango no se puede saber a quién le toca, y sin ningún precio la
    // fila no ofrece nada.
    if (desde === null || hasta === null) continue
    if (domicilio === null && sucursal === null) continue

    zonas.push({
      transporte: String(fila.transporte || '').trim() || 'Envío',
      zona: String(fila.zona || '').trim(),
      desde: Math.min(desde, hasta),
      hasta: Math.max(desde, hasta),
      domicilio,
      sucursal,
      dias: String(fila.dias || '').trim(),
    })
  }

  return zonas
}

let cache = null

export async function getZonas({ force = false } = {}) {
  const url = csvUrl()
  if (!url) return ZONAS_POR_DEFECTO

  if (!force && cache && Date.now() - cache.at < TTL) return cache.zonas

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'lunare-catalog' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const zonas = normalizarFilas(parseCSV(await res.text()))
    // Una pestaña vacía o mal cargada no puede dejar la tienda sin poder
    // cobrar el envío: se sigue con lo último que anduvo.
    if (!zonas.length) throw new Error('la pestaña de envíos no tiene filas usables')

    cache = { at: Date.now(), zonas }
    return zonas
  } catch (err) {
    console.error('[envios] no se pudo leer la pestaña de envíos', err)
    return cache?.zonas || ZONAS_POR_DEFECTO
  }
}

export const cpValido = cp => /^\d{4}$/.test(String(cp || '').trim())

// Las opciones que le llegan a un código postal, de la más barata a la
// más cara. Para cada transporte y modalidad gana la fila más específica.
//
// Está duplicada en src/lib/envios.js, que la usa el navegador para
// mostrar los precios mientras se escribe el código postal. Son quince
// líneas; compartirlas costaría más que repetirlas.
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

// Las opciones ya con el precio final. Cada transporte que tenga API
// configurada reemplaza su propio precio; el resto queda con el del
// Sheet, que es el que se usa mientras no haya credenciales.
export async function cotizar(cp, { piezas = 1, valorDeclarado = 0 } = {}) {
  const opciones = opcionesDeEnvio(await getZonas(), cp)
  if (!opciones.length) return []

  // En paralelo: son dos servicios distintos y cada uno toca solo sus
  // propias filas, así que esperar uno atrás del otro sería regalar
  // segundos en el peor momento, que es mientras la clienta elige.
  const [conAndreani, conCorreo] = await Promise.all([
    tarifasAndreani(opciones, { cp, piezas, valorDeclarado }),
    tarifasMiCorreo(opciones, { cp, piezas }),
  ])

  const porId = new Map(conAndreani.map(o => [o.id, o]));
  for (const o of conCorreo) if (o.envivo) porId.set(o.id, o)

  return [...porId.values()].sort((a, b) => a.costo - b.costo)
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
