// ── POST /api/pedido ──────────────────────────────────────────
// Crea un pedido. El navegador manda qué piezas y cuántas; los precios,
// el stock y el costo de envío los pone el servidor.
//
// Antes un pedido solo existía como un chat de WhatsApp. Ahora queda
// registrado con número, estado y el precio congelado del día.

import { waitUntil } from '@vercel/functions'
import { getCatalog } from './_catalog.js'
import { avisarPedido } from './_aviso.js'
import {
  ENTREGAS, PAGOS, costoEnvio, validarItems, crearPedido, pedidosConfigurados,
} from './_pedidos.js'

const limpiar = (v, max) => String(v ?? '').trim().slice(0, max)

function validarDatos(b) {
  const errores = []

  const nombre = limpiar(b.nombre, 80)
  const telefono = limpiar(b.telefono, 40)
  const email = limpiar(b.email, 120)
  const entrega = limpiar(b.entrega, 30)
  const pago = limpiar(b.pago, 20)
  const cp = limpiar(b.cp, 10)
  const direccion = limpiar(b.direccion, 200)
  const notas = limpiar(b.notas, 500)

  if (nombre.length < 2) errores.push({ codigo: 'NOMBRE_REQUERIDO' })
  // Sin teléfono no hay forma de avisarle a la clienta que salió el pedido.
  if (telefono.replace(/\D/g, '').length < 8) errores.push({ codigo: 'TELEFONO_INVALIDO' })
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errores.push({ codigo: 'EMAIL_INVALIDO' })
  if (!ENTREGAS[entrega]) errores.push({ codigo: 'ENTREGA_INVALIDA' })
  if (!PAGOS[pago]) errores.push({ codigo: 'PAGO_INVALIDO' })

  const esEnvio = ENTREGAS[entrega]?.envio
  if (esEnvio && !/^\d{4}$/.test(cp)) errores.push({ codigo: 'CP_REQUERIDO' })
  if (esEnvio && direccion.length < 5) errores.push({ codigo: 'DIRECCION_REQUERIDA' })
  // El efectivo es solo para quien retira en persona; la base también lo
  // rechaza, pero conviene decirlo antes y con un mensaje claro.
  if (PAGOS[pago]?.soloRetiro && esEnvio) errores.push({ codigo: 'EFECTIVO_SOLO_RETIRO' })

  return { errores, datos: { nombre, telefono, email, entrega, pago, cp, direccion, notas } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'METODO_NO_PERMITIDO' })
  }
  if (!pedidosConfigurados()) {
    console.error('[pedido] faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    return res.status(503).json({ ok: false, error: 'PEDIDOS_NO_CONFIGURADOS' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'CUERPO_INVALIDO' })
  }

  const { errores: erroresDatos, datos } = validarDatos(body)

  let catalogo
  try {
    catalogo = await getCatalog()
  } catch (err) {
    console.error('[pedido] no se pudo leer el catálogo', err)
    return res.status(502).json({ ok: false, error: 'CATALOGO_NO_DISPONIBLE' })
  }

  const { errores: erroresItems, items } = validarItems(body.items, catalogo)
  const errores = [...erroresDatos, ...erroresItems]
  if (errores.length) return res.status(400).json({ ok: false, error: 'DATOS_INVALIDOS', errores })

  const subtotal = items.reduce((t, i) => t + i.precio_unitario * i.cantidad, 0)
  const envio = costoEnvio(datos.entrega, subtotal)

  try {
    const r = await crearPedido({ ...datos, costo_envio: envio }, items)

    // La base rechaza el pedido si otra persona se llevó la última pieza
    // entre que se armó el carrito y se confirmó.
    if (!r?.ok) return res.status(409).json(r ?? { ok: false, error: 'NO_SE_PUDO_CREAR' })

    // A partir de acá el pedido ya está guardado. El aviso sale después de
    // responder —la clienta no espera al servidor de mail— y si falla, se
    // queda en los logs sin romper la compra.
    const aviso = avisarPedido({ pedido: r.pedido, datos, items })
    try {
      waitUntil(aviso)
    } catch {
      // Fuera de Vercel (npm run dev) no hay contexto para diferirlo.
      await aviso
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(201).json({
      ok: true,
      pedido: r.pedido,
      items: items.map(i => ({
        producto_id: i.producto_id,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
    })
  } catch (err) {
    console.error('[pedido]', err)
    return res.status(500).json({ ok: false, error: 'NO_SE_PUDO_CREAR' })
  }
}
