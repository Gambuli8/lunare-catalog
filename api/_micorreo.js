// ── MiCorreo (Correo Argentino) ───────────────────────────────
// Cotización en vivo para las filas del Sheet cuyo transporte sea Correo
// Argentino. Si no está configurado, esas filas siguen costando lo que
// diga la planilla.
//
//   MICORREO_USUARIO=...      # las pide Correo, distintas por ambiente
//   MICORREO_PASSWORD=...
//   MICORREO_CLIENTE=...      # el customerId de la cuenta de MiCorreo
//   MICORREO_CP_ORIGEN=6300   # desde dónde se despacha (opcional)
//   MICORREO_AMBIENTE=test    # "test" apunta al ambiente de pruebas
//
// A diferencia de Paq.ar —la otra API de Correo, que pide acuerdo
// comercial y ni siquiera cotiza— MiCorreo es de alta abierta: uno se
// registra con DNI o CUIT y despacha en cualquier sucursal. Las
// credenciales de la API se piden por formulario.
//
// Un solo pedido devuelve las dos tarifas, a domicilio ("D") y a
// sucursal ("S"), así que cotizar cuesta una sola llamada.
//
// Ante cualquier problema se devuelve null y el precio queda en el del
// Sheet. Nunca se deja a la clienta sin poder comprar por esto.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

const base = () => process.env.MICORREO_AMBIENTE === 'test'
  ? 'https://apitest.correoargentino.com.ar/micorreo/v1'
  : 'https://api.correoargentino.com.ar/micorreo/v1'

const usuario = () => process.env.MICORREO_USUARIO || ''
const password = () => process.env.MICORREO_PASSWORD || ''
const cliente = () => process.env.MICORREO_CLIENTE || ''
const cpOrigen = () => process.env.MICORREO_CP_ORIGEN || '6300'

export const micorreoConfigurado = () =>
  Boolean(usuario() && password() && cliente())

// Mismo criterio de peso que con Andreani: lo que pesa es el packaging.
const GRAMOS_BASE = 150
const GRAMOS_POR_PIEZA = 60
const CAJA = { height: 10, width: 10, length: 10 }

const esCorreo = nombre => /correo\s*argentino|paq\.?\s*ar/i.test(String(nombre || ''))

// ── Token ─────────────────────────────────────────────────────
// Se pide con usuario y contraseña, dura un par de horas y se reusa: si
// se pidiera uno por cotización, cada búsqueda serían dos llamadas.

let token = null

async function conseguirToken() {
  if (token && token.vence > Date.now() + 60_000) return token.valor

  const credenciales = Buffer.from(`${usuario()}:${password()}`).toString('base64')
  const res = await fetch(`${base()}/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credenciales}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const datos = await res.json()
  if (!datos?.token) throw new Error('la respuesta del token no trae token')

  const vence = Date.parse(datos.expires)
  token = {
    valor: datos.token,
    // Si la fecha viene rara, se usa media hora y listo.
    vence: Number.isFinite(vence) ? vence : Date.now() + 30 * 60_000,
  }
  return token.valor
}

// ── Cotización ────────────────────────────────────────────────

export async function cotizar({ cp, piezas = 1 }) {
  if (!micorreoConfigurado()) return null

  const cuerpo = {
    customerId: cliente(),
    postalCodeOrigin: cpOrigen(),
    postalCodeDestination: String(cp),
    // Sin deliveredType devuelve las dos: a domicilio y a sucursal.
    dimensions: { weight: GRAMOS_BASE + GRAMOS_POR_PIEZA * piezas, ...CAJA },
  }

  try {
    const res = await fetch(`${base()}/rates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await conseguirToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`rates ${res.status}: ${(await res.text()).slice(0, 200)}`)

    const datos = await res.json()
    const precios = {}
    for (const tarifa of datos?.rates || []) {
      const precio = Number(tarifa.price)
      if (!Number.isFinite(precio) || precio <= 0) continue
      // Redondeado a la centena de arriba, igual que Andreani: nadie
      // quiere explicar por qué el envío sale $498,06.
      const redondeado = Math.ceil(precio / 100) * 100
      if (tarifa.deliveredType === 'D') precios.domicilio = redondeado
      if (tarifa.deliveredType === 'S') precios.sucursal = redondeado
    }

    return Object.keys(precios).length ? precios : null
  } catch (err) {
    console.error(`[micorreo] no se pudo cotizar a ${cp}`, err)
    // El token puede haber vencido antes de tiempo: se descarta para que
    // el próximo intento pida uno nuevo.
    token = null
    return null
  }
}

// Reemplaza el precio de las opciones de Correo Argentino por el que
// cotiza la API. Las demás quedan como están.
export async function aplicarTarifas(opciones, { cp, piezas }) {
  if (!micorreoConfigurado()) return opciones
  if (!opciones.some(o => esCorreo(o.transporte))) return opciones

  const precios = await cotizar({ cp, piezas })
  if (!precios) return opciones

  return opciones
    .map(o => {
      if (!esCorreo(o.transporte)) return o
      const costo = precios[o.modo]
      return costo === undefined ? o : { ...o, costo, envivo: true }
    })
    .sort((a, b) => a.costo - b.costo)
}
