// ── Tarifas de envío ──────────────────────────────────────────
// Salen de una pestaña del mismo Google Sheet del catálogo, para que las
// pueda cambiar Lunare cuando aumenta el correo, sin tocar código ni
// esperar un deploy.
//
// La pestaña se llama "Envios" y tiene estas columnas:
//
//   Zona            | CP desde | CP hasta | Domicilio | Sucursal | Dias
//   La Pampa        | 6300     | 6399     | 5500      | 4500     | 2 a 3
//   Resto del país  | 1000     | 9999     | 12000     | 9500     | 5 a 8
//
// Gana la fila más específica: si el CP entra en dos zonas, manda la del
// rango más chico. Así una fila puntual para Santa Rosa le gana a la
// fila general del país sin tener que ordenar nada a mano.
//
// El transporte no se elige acá: despacha Lunare por Andreani, Correo
// Argentino o Integral Pack según la zona y el día. La clienta elige
// entre domicilio y sucursal, que es lo que le cambia el precio.
//
// Sin SHEET_ENVIOS_CSV_URL se usan las tarifas de abajo y la tienda
// funciona igual que antes.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { parseCSV } from './_catalog.js'

const csvUrl = () => process.env.SHEET_ENVIOS_CSV_URL
const TTL = 5 * 60 * 1000

// Provisorias, hasta que exista la pestaña. Un solo precio para todo el
// país, que es lo que había antes de separar por zona.
export const ZONAS_POR_DEFECTO = [
  { zona: 'Todo el país', desde: 1000, hasta: 9999, domicilio: 6800, sucursal: 6800, dias: '' },
]

const aNumero = v => {
  // Viene del Sheet: puede traer "$", puntos de miles y coma decimal.
  const limpio = String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
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

    // Una fila sin rango o sin precio a domicilio no sirve para cotizar.
    if (desde === null || hasta === null || domicilio === null) continue

    zonas.push({
      zona: String(fila.zona || '').trim() || 'Envío',
      desde: Math.min(desde, hasta),
      hasta: Math.max(desde, hasta),
      domicilio,
      // Sin precio de sucursal, esa opción no se ofrece para esa zona.
      sucursal: sucursal === null ? null : sucursal,
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

// La fila más específica gana: entre "Todo el país" y una fila puesta
// para Santa Rosa, vale la de Santa Rosa.
export function zonaDeCp(zonas, cp) {
  if (!cpValido(cp)) return null
  const n = Number(cp)
  return zonas
    .filter(z => n >= z.desde && n <= z.hasta)
    .sort((a, b) => (a.hasta - a.desde) - (b.hasta - b.desde))[0] || null
}

// Lo que se le muestra a la clienta para su código postal.
export async function cotizar(cp) {
  const zonas = await getZonas()
  const z = zonaDeCp(zonas, cp)
  if (!z) return null
  return {
    zona: z.zona,
    dias: z.dias,
    domicilio: z.domicilio,
    sucursal: z.sucursal,
  }
}
