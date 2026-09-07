// ── Panel de pedidos ──────────────────────────────────────────
// Acceso con una sola clave compartida: no hay usuarios ni cuentas
// porque del otro lado hay una persona.
//
// A diferencia de la cortina de mantenimiento —que es una cortina y así
// está documentada—, acá sí hay datos que proteger: nombres, teléfonos y
// direcciones de las clientas. Por eso la clave nunca viaja en la URL,
// solo por POST, y el panel no anda si la clave es corta.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { createHash, timingSafeEqual } from 'node:crypto'

export const COOKIE = 'lunare_panel'
const HORAS = 12

// 16 caracteres no es un capricho: la única defensa contra que alguien
// pruebe claves contra el endpoint es que adivinarla sea inviable.
const MINIMO = 16

const clave = () => process.env.PANEL_PASSWORD || ''

export const panelConfigurado = () => clave().length >= MINIMO

// El token de la cookie es un hash de la clave: si alguien le mira las
// cookies al navegador, no se lleva la clave.
const hash = valor => createHash('sha256').update(`lunare-panel:${valor}`).digest('hex')

export const tokenEsperado = () => hash(clave())

// Comparación de tiempo constante: no filtra la clave midiendo cuánto
// tarda en fallar.
function igual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  if (x.length !== y.length) return false
  return timingSafeEqual(x, y)
}

export const claveCorrecta = enviada => Boolean(clave()) && igual(enviada, clave())

export function leerCookie(req, nombre) {
  const crudo = req.headers?.cookie || ''
  for (const parte of crudo.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nombre) return v.join('=')
  }
  return null
}

export function autorizado(req) {
  if (!panelConfigurado()) return false
  const cookie = leerCookie(req, COOKIE)
  return Boolean(cookie) && igual(cookie, tokenEsperado())
}

// En localhost no se puede marcar Secure o el navegador no manda la
// cookie y no se puede probar el panel en desarrollo.
const esLocal = req => /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(
  req.headers?.['x-forwarded-host'] || req.headers?.host || ''
)

export function cookieSesion(req) {
  const secure = esLocal(req) ? '' : ' Secure;'
  return `${COOKIE}=${tokenEsperado()}; Path=/; Max-Age=${HORAS * 60 * 60}; HttpOnly;${secure} SameSite=Strict`
}

export function cookieVacia(req) {
  const secure = esLocal(req) ? '' : ' Secure;'
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly;${secure} SameSite=Strict`
}

// El panel no se indexa ni se cachea nunca.
export function cabeceras(res) {
  res.setHeader('Cache-Control', 'no-store, must-revalidate')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
}
