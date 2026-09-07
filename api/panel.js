// ── /api/panel ────────────────────────────────────────────────
// Los datos del panel. Todo pide la cookie de sesión que deja
// /api/panel-login; sin ella devuelve 401 y no toca la base.
//
//   GET  ?vista=pedidos&estado=pendiente   la lista, con sus piezas
//   GET  ?vista=arrepentimientos           los trámites abiertos
//   GET  ?vista=resumen                    los números de la cabecera
//   POST { tipo, id, estado }              cambia un estado

import { rpc, supabaseConfigurado } from './_supabase.js'
import { autorizado, panelConfigurado, cabeceras } from './_panel.js'

const ESTADOS_PEDIDO = ['pendiente', 'pagado', 'despachado', 'entregado', 'cancelado']
const ESTADOS_ARREPENTIMIENTO = ['recibido', 'en_curso', 'resuelto', 'rechazado']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  cabeceras(res)

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

      const estado = String(req.query?.estado || '')
      // Un estado que no existe se ignora en vez de romper: es un filtro.
      const p_estado = ESTADOS_PEDIDO.includes(estado) ? estado : null
      return res.status(200).json({
        ok: true,
        pedidos: await rpc('listar_pedidos', { p_estado, p_limite: 60 }),
      })
    }

    if (req.method === 'POST') {
      let body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }

      const id = String(body?.id || '')
      const estado = String(body?.estado || '')
      const tipo = String(body?.tipo || 'pedido')

      if (!UUID.test(id)) return res.status(400).json({ ok: false, error: 'ID_INVALIDO' })

      const validos = tipo === 'arrepentimiento' ? ESTADOS_ARREPENTIMIENTO : ESTADOS_PEDIDO
      if (!validos.includes(estado)) {
        return res.status(400).json({ ok: false, error: 'ESTADO_INVALIDO' })
      }

      const fn = tipo === 'arrepentimiento' ? 'cambiar_estado_arrepentimiento' : 'cambiar_estado_pedido'
      const r = await rpc(fn, { p_id: id, p_estado: estado })
      if (!r?.ok) return res.status(404).json(r ?? { ok: false, error: 'NO_ENCONTRADO' })
      return res.status(200).json(r)
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  } catch (err) {
    console.error('[panel]', err)
    return res.status(500).json({ ok: false, error: 'ERROR_INTERNO' })
  }
}
