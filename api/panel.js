// ── /api/panel ────────────────────────────────────────────────
// Todo el panel en una sola función: la sesión, los pedidos y el
// catálogo. Vercel cobra por función y en el plan gratis hay un tope,
// así que no conviene una por cada cosa.
//
// Sesión (no pide cookie):
//   POST { accion: 'entrar', password }    deja la cookie
//   POST { accion: 'salir' }               la borra
//   POST { accion: 'estado' }              ¿hay sesión?
//
// Todo lo demás pide la cookie; sin ella devuelve 401 y no toca la base:
//   GET  ?vista=pedidos&estado=pendiente   la lista, con sus piezas
//   GET  ?vista=arrepentimientos           los trámites abiertos
//   GET  ?vista=resumen                    los números de la cabecera
//   GET  ?vista=productos                  el catálogo entero, ver _productos.js
//   POST { tipo, id, estado }              cambia un estado
//   POST { tipo: 'seguimiento', id, transporte, seguimiento }
//                                          despacha y avisa a la clienta
//   POST { tipo: 'producto' | 'borrar_producto' | 'importar_planilla' | 'firma_foto', ... }
//                                          ver _productos.js

import { waitUntil } from '@vercel/functions'
import { rpc, supabaseConfigurado } from './_supabase.js'
import { avisarDespacho } from './_aviso.js'
import {
  autorizado, panelConfigurado, cabeceras, claveCorrecta, cookieSesion, cookieVacia,
} from './_panel.js'
import { ACCIONES_PRODUCTOS, listarProductosPanel } from './_productos.js'

const ESTADOS_PEDIDO = ['pendiente', 'pagado', 'despachado', 'entregado', 'cancelado']
const ESTADOS_ARREPENTIMIENTO = ['recibido', 'en_curso', 'resuelto', 'rechazado']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Un respiro antes de contestar que la clave está mal: no frena a nadie
// decidido, pero encarece probar de a miles.
const frenar = () => new Promise(r => setTimeout(r, 700))

function leerCuerpo(req) {
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  return body && typeof body === 'object' ? body : {}
}

// ── Sesión ────────────────────────────────────────────────────
// La clave viaja por POST y nunca por la URL, para que no quede en el
// historial ni en los logs del servidor.
async function sesion(req, res, body) {
  // Cerrar sesión no necesita clave, solo borrar la cookie.
  if (body.accion === 'salir') {
    res.setHeader('Set-Cookie', cookieVacia(req))
    return res.status(200).json({ ok: true, sesion: false })
  }

  if (!panelConfigurado()) {
    console.error('[panel] falta PANEL_PASSWORD, o tiene menos de 16 caracteres')
    return res.status(503).json({ ok: false, error: 'PANEL_NO_CONFIGURADO' })
  }

  // Para que el frontend sepa si ya hay sesión sin pedir la clave.
  if (body.accion === 'estado') {
    return res.status(200).json({ ok: true, sesion: autorizado(req) })
  }

  if (!claveCorrecta(body.password ?? '')) {
    await frenar()
    return res.status(401).json({ ok: false, error: 'CLAVE_INCORRECTA' })
  }

  res.setHeader('Set-Cookie', cookieSesion(req))
  return res.status(200).json({ ok: true, sesion: true })
}

export default async function handler(req, res) {
  cabeceras(res)

  const body = req.method === 'POST' ? leerCuerpo(req) : {}
  if (['entrar', 'salir', 'estado'].includes(body.accion)) return sesion(req, res, body)

  if (!panelConfigurado()) {
    console.error('[panel] falta PANEL_PASSWORD, o tiene menos de 16 caracteres')
    return res.status(503).json({ ok: false, error: 'PANEL_NO_CONFIGURADO' })
  }
  if (!autorizado(req)) {
    return res.status(401).json({ ok: false, error: 'NO_AUTORIZADO' })
  }
  if (!supabaseConfigurado()) {
    console.error('[panel] faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    return res.status(503).json({ ok: false, error: 'NO_CONFIGURADO' })
  }

  try {
    if (req.method === 'GET') {
      const vista = String(req.query?.vista || 'pedidos')

      if (vista === 'resumen') {
        return res.status(200).json({ ok: true, resumen: await rpc('resumen_panel', {}) })
      }
      if (vista === 'arrepentimientos') {
        return res.status(200).json({
          ok: true,
          arrepentimientos: await rpc('listar_arrepentimientos', { p_limite: 60 }),
        })
      }
      if (vista === 'productos') {
        return res.status(200).json({ ok: true, ...(await listarProductosPanel()) })
      }

      const estado = String(req.query?.estado || '')
      // Un estado que no existe se ignora en vez de romper: es un filtro.
      const p_estado = ESTADOS_PEDIDO.includes(estado) ? estado : null
      return res.status(200).json({
        ok: true,
        pedidos: await rpc('listar_pedidos', { p_estado, p_limite: 60 }),
      })
    }

    if (req.method === 'POST') {
      const tipo = String(body.tipo || 'pedido')

      // El catálogo tiene sus propias acciones y sus propias validaciones.
      if (ACCIONES_PRODUCTOS[tipo]) {
        const r = await ACCIONES_PRODUCTOS[tipo](body)
        return res.status(r.status || (r.ok ? 200 : 400)).json(r.cuerpo ?? r)
      }

      const id = String(body.id || '')
      const estado = String(body.estado || '')

      if (!UUID.test(id)) return res.status(400).json({ ok: false, error: 'ID_INVALIDO' })

      // Cargar el número de seguimiento es despachar: la base mueve el
      // estado y acá sale el aviso a la clienta con el link para rastrear.
      if (tipo === 'seguimiento') {
        const seguimiento = String(body.seguimiento || '').trim().slice(0, 60)
        const transporte = String(body.transporte || '').trim().slice(0, 60)
        if (!seguimiento) return res.status(400).json({ ok: false, error: 'SEGUIMIENTO_REQUERIDO' })

        const r = await rpc('guardar_seguimiento', {
          p_pedido_id: id,
          p_transporte: transporte,
          p_seguimiento: seguimiento,
        })
        if (!r?.ok) return res.status(404).json(r ?? { ok: false, error: 'NO_ENCONTRADO' })

        // El mail sale después de responder: si falla el servidor de
        // correo, el número ya quedó guardado igual.
        const aviso = avisarDespacho({ pedido: r.pedido })
        try { waitUntil(aviso) } catch { await aviso }

        return res.status(200).json(r)
      }

      const validos = tipo === 'arrepentimiento' ? ESTADOS_ARREPENTIMIENTO : ESTADOS_PEDIDO
      if (!validos.includes(estado)) {
        return res.status(400).json({ ok: false, error: 'ESTADO_INVALIDO' })
      }

      const fn = tipo === 'arrepentimiento' ? 'cambiar_estado_arrepentimiento' : 'cambiar_estado_pedido'
      const r = await rpc(fn, { p_id: id, p_estado: estado })
      if (!r?.ok) return res.status(r?.error === 'SIN_STOCK' ? 409 : 404).json(r ?? { ok: false, error: 'NO_ENCONTRADO' })
      return res.status(200).json(r)
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  } catch (err) {
    console.error('[panel]', err)
    return res.status(500).json({ ok: false, error: 'ERROR_INTERNO' })
  }
}
