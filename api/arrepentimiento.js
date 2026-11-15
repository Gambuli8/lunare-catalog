// ── POST /api/arrepentimiento ─────────────────────────────────
// El botón de arrepentimiento de la Resolución 424/2020: la clienta pide
// revocar la compra y el servidor le devuelve un código de identificación
// del trámite.
//
// La norma prohíbe exigir registración previa o cualquier trámite extra,
// así que acá no hay login ni número de pedido obligatorio: alcanza con
// nombre y correo, que es a donde se manda el código.
//
// El código sale en la misma respuesta —no en 24 horas— porque lo genera
// la base en el insert.

import { waitUntil } from '@vercel/functions'
import { rpc, supabaseConfigurado } from './_supabase.js'
import { avisarArrepentimiento } from './_aviso.js'

const limpiar = (v, max) => String(v ?? '').trim().slice(0, max)

function validar(b) {
  const errores = []

  const nombre = limpiar(b.nombre, 80)
  const email = limpiar(b.email, 120)
  const telefono = limpiar(b.telefono, 40)
  const pedido_numero = limpiar(b.pedido_numero, 20)
  const detalle = limpiar(b.detalle, 1000)

  if (nombre.length < 2) errores.push({ codigo: 'NOMBRE_REQUERIDO' })
  // Sin correo no hay dónde mandarle el código que exige la norma.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errores.push({ codigo: 'EMAIL_REQUERIDO' })
  if (telefono && telefono.replace(/\D/g, '').length < 8) errores.push({ codigo: 'TELEFONO_INVALIDO' })

  return { errores, datos: { nombre, email, telefono, pedido_numero, detalle } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  }
  if (!supabaseConfigurado()) {
    console.error('[arrepentimiento] faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    return res.status(503).json({ ok: false, error: 'NO_CONFIGURADO' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'CUERPO_INVALIDO' })
  }

  const { errores, datos } = validar(body)
  if (errores.length) return res.status(400).json({ ok: false, error: 'DATOS_INVALIDOS', errores })

  try {
    const r = await rpc('crear_arrepentimiento', { p: datos })
    if (!r?.ok) return res.status(500).json({ ok: false, error: 'NO_SE_PUDO_REGISTRAR' })

    // Igual que con los pedidos: el trámite ya quedó registrado, así que
    // el mail sale después de responder y una falla no se lo lleva puesto.
    const aviso = avisarArrepentimiento({ arrepentimiento: r.arrepentimiento, datos })
    try {
      waitUntil(aviso)
    } catch {
      await aviso // ver la nota en pedido.js
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(201).json({ ok: true, arrepentimiento: r.arrepentimiento })
  } catch (err) {
    console.error('[arrepentimiento]', err)
    return res.status(500).json({ ok: false, error: 'NO_SE_PUDO_REGISTRAR' })
  }
}
