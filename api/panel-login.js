// ── POST /api/panel-login ─────────────────────────────────────
// Entrar y salir del panel. La clave viaja por POST y nunca por la URL,
// para que no quede en el historial ni en los logs del servidor.

import {
  claveCorrecta, panelConfigurado, cookieSesion, cookieVacia, cabeceras, autorizado,
} from './_panel.js'

// Un respiro antes de contestar que la clave está mal: no frena a nadie
// decidido, pero encarece probar de a miles.
const frenar = () => new Promise(r => setTimeout(r, 700))

export default async function handler(req, res) {
  cabeceras(res)

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }

  // Cerrar sesión no necesita clave, solo borrar la cookie.
  if (body?.accion === 'salir') {
    res.setHeader('Set-Cookie', cookieVacia(req))
    return res.status(200).json({ ok: true, sesion: false })
  }

  if (!panelConfigurado()) {
    console.error('[panel] falta PANEL_PASSWORD, o tiene menos de 16 caracteres')
    return res.status(503).json({ ok: false, error: 'PANEL_NO_CONFIGURADO' })
  }

  // Para que el frontend sepa si ya hay sesión sin pedir la clave.
  if (body?.accion === 'estado') {
    return res.status(200).json({ ok: true, sesion: autorizado(req) })
  }

  if (!claveCorrecta(body?.password ?? '')) {
    await frenar()
    return res.status(401).json({ ok: false, error: 'CLAVE_INCORRECTA' })
  }

  res.setHeader('Set-Cookie', cookieSesion(req))
  return res.status(200).json({ ok: true, sesion: true })
}
