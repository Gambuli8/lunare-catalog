// ── Andreani ──────────────────────────────────────────────────
// Cotización en vivo por código postal, para las filas del Sheet cuyo
// transporte sea Andreani. Si no está configurado, esas filas siguen
// costando lo que diga la planilla.
//
//   ANDREANI_CONTRATO_DOMICILIO=...   # envío a domicilio
//   ANDREANI_CONTRATO_SUCURSAL=...    # envío a sucursal
//
// Son dos contratos distintos: Andreani cobra los servicios por separado
// y cada uno tiene su número. Salen de la cuenta comercial de Lunare; el
// número de ejemplo de la documentación cotiza tarifas que no son las
// nuestras, así que no sirve para cobrar.
//
// Ante cualquier problema —sin contrato, la API caída, una respuesta
// rara— se devuelve null y el precio queda en el del Sheet. Nunca se
// deja a la clienta sin poder comprar por esto.
//
// El listado de sucursales es público y no necesita contrato.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

const API = 'https://apis.andreani.com'

const contratos = () => ({
  domicilio: process.env.ANDREANI_CONTRATO_DOMICILIO || '',
  sucursal: process.env.ANDREANI_CONTRATO_SUCURSAL || '',
})

export const andreaniConfigurado = () =>
  Boolean(contratos().domicilio || contratos().sucursal)

// Una pieza de plata pesa poco; lo que pesa es el packaging. Con estos
// números Andreani cobra por peso aforado mínimo, que es lo que pasa con
// cualquier caja chica.
const GRAMOS_BASE = 150
const GRAMOS_POR_PIEZA = 60
const VOLUMEN_CM3 = 1000 // una caja de 10 × 10 × 10

const esAndreani = nombre => /andreani/i.test(String(nombre || ''))

export async function cotizar({ cp, modo, piezas = 1, valorDeclarado = 0 }) {
  const contrato = contratos()[modo]
  if (!contrato) return null

  const kilos = (GRAMOS_BASE + GRAMOS_POR_PIEZA * piezas) / 1000
  const params = new URLSearchParams({
    cpDestino: String(cp),
    contrato,
    'bultos[0][valorDeclarado]': String(Math.max(0, Math.round(valorDeclarado))),
    'bultos[0][volumen]': String(VOLUMEN_CM3),
    'bultos[0][kilos]': String(kilos),
  })

  try {
    const res = await fetch(`${API}/v1/tarifas?${params}`, {
      headers: { 'User-Agent': 'lunare-catalog' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const datos = await res.json()
    const total = Number(datos?.tarifaConIva?.total)
    if (!Number.isFinite(total) || total <= 0) throw new Error('tarifa sin total')

    // Redondeado a la centena de arriba: un envío a $877,06 se cobra
    // $900 y no hay que explicar los centavos.
    return Math.ceil(total / 100) * 100
  } catch (err) {
    console.error(`[andreani] no se pudo cotizar a ${cp} (${modo})`, err)
    return null
  }
}

// Reemplaza el precio de las opciones de Andreani por el que cotiza la
// API. Las demás quedan como están.
export async function aplicarTarifas(opciones, { cp, piezas, valorDeclarado }) {
  if (!andreaniConfigurado()) return opciones

  const cotizadas = await Promise.all(opciones.map(async o => {
    if (!esAndreani(o.transporte)) return o
    const costo = await cotizar({ cp, modo: o.modo, piezas, valorDeclarado })
    return costo === null ? o : { ...o, costo, envivo: true }
  }))

  return cotizadas.sort((a, b) => a.costo - b.costo)
}

// ── Sucursales ────────────────────────────────────────────────
// Público, sin contrato. Sirve para decirle a la clienta a qué sucursal
// le llega el paquete en vez de "a sucursal" a secas.

let cache = null
const TTL = 12 * 60 * 60 * 1000

export async function sucursales() {
  if (cache && Date.now() - cache.at < TTL) return cache.lista

  try {
    const res = await fetch(`${API}/v2/sucursales`, {
      headers: { 'User-Agent': 'lunare-catalog' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const lista = (await res.json())
      // B2C son las que atienden público. El resto son plantas y centros
      // de procesamiento, y varias están marcadas "NO USAR".
      .filter(s => s.canal === 'B2C' && !/no usar/i.test(s.descripcion || ''))
      .map(s => ({
        id: s.id,
        nombre: s.descripcion,
        provincia: s.direccion?.provincia || '',
        localidad: s.direccion?.localidad || '',
        cp: s.direccion?.codigoPostal || '',
        direccion: [s.direccion?.calle, s.direccion?.numero].filter(Boolean).join(' '),
      }))

    cache = { at: Date.now(), lista }
    return lista
  } catch (err) {
    console.error('[andreani] no se pudo leer el listado de sucursales', err)
    return cache?.lista || []
  }
}
