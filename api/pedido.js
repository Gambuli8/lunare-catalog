// ── POST /api/pedido ──────────────────────────────────────────
// Crea un pedido. El navegador manda qué piezas y cuántas; los precios,
// el stock y el costo de envío los pone el servidor.
//
// Antes un pedido solo existía como un chat de WhatsApp. Ahora queda
// registrado con número, estado y el precio congelado del día.

import { waitUntil } from '@vercel/functions'
import { getCatalog } from './_catalog.js'
import { avisarPedido } from './_aviso.js'
import { rpc, supabaseConfigurado } from './_supabase.js'
import { crearPreferencia, mpConfigurado } from './_mp.js'
import {
  ENTREGAS, PAGOS, resolverEnvio, validarItems, crearPedido, pedidosConfigurados,
} from './_pedidos.js'

const limpiar = (v, max) => String(v ?? '').trim().slice(0, max)

function validarDatos(b) {
  const errores = []

  const nombre = limpiar(b.nombre, 80)
  const telefono = limpiar(b.telefono, 40)
  const email = limpiar(b.email, 120)
  const entrega = limpiar(b.entrega, 30)
  const transporte = limpiar(b.transporte, 60)
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
  // A sucursal no hace falta la dirección: la retira ella y la sucursal
  // se coordina por WhatsApp.
  if (ENTREGAS[entrega]?.modo === 'domicilio' && direccion.length < 5) {
    errores.push({ codigo: 'DIRECCION_REQUERIDA' })
  }
  // El efectivo es solo para quien retira en persona; la base también lo
  // rechaza, pero conviene decirlo antes y con un mensaje claro.
  if (PAGOS[pago]?.soloRetiro && esEnvio) errores.push({ codigo: 'EFECTIVO_SOLO_RETIRO' })

  return {
    errores,
    datos: { nombre, telefono, email, entrega, transporte, pago, cp, direccion, notas },
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── GET /api/pedido?id=<uuid> ─────────────────────────────────
// Le dice al navegador si un pedido sigue esperando el pago, para no
// recordarle que pague a alguien que ya pagó.
//
// Se pide por el id (un uuid que solo conoce quien hizo el pedido) y no
// por el número, que es correlativo y se adivina. Y devuelve únicamente
// el número y el estado: nada de nombre, teléfono ni dirección.
//
// Antes era su propio endpoint (/api/pedido-estado); vive acá para no
// gastar una función de Vercel en algo tan chico.
async function estadoDelPedido(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!supabaseConfigurado()) {
    return res.status(503).json({ ok: false, error: 'PEDIDOS_NO_CONFIGURADOS' })
  }

  const id = String(req.query?.id || '')
  if (!UUID.test(id)) return res.status(400).json({ ok: false, error: 'ID_INVALIDO' })

  try {
    const pedido = await rpc('pedido_por_id', { p_pedido_id: id })
    if (!pedido) return res.status(404).json({ ok: false, error: 'NO_EXISTE' })
    return res.status(200).json({ ok: true, numero: pedido.numero, estado: pedido.estado })
  } catch (err) {
    console.error('[pedido-estado]', err)
    return res.status(502).json({ ok: false, error: 'NO_DISPONIBLE' })
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return estadoDelPedido(req, res)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
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

  // El precio del envío sale del código postal, en el servidor. El
  // carrito muestra el suyo, pero el que se cobra es este.
  const envio = await resolverEnvio({
    entrega: datos.entrega,
    transporte: datos.transporte,
    subtotal,
    cp: datos.cp,
    piezas: items.reduce((n, i) => n + i.cantidad, 0),
  })
  if (!envio.ok) {
    return res.status(400).json({
      ok: false, error: 'DATOS_INVALIDOS', errores: [{ codigo: envio.codigo }],
    })
  }

  try {
    const r = await crearPedido({ ...datos, costo_envio: envio.costo }, items)

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
      // Fuera de Vercel waitUntil no hace nada y el mail sale igual, porque
      // el proceso de `npm run dev` sigue vivo. El await es por si algún día
      // corre en un runtime que sí se congela después de responder.
      await aviso
    }

    // Si eligió Mercado Pago, armamos la preferencia y le devolvemos el
    // link para redirigirla. Si algo falla acá el pedido ya está guardado:
    // devolvemos igual el 201 sin pago_url y el checkout cae en coordinar
    // por WhatsApp, que es como funcionaba antes.
    let pago_url = null
    if (datos.pago === 'mercadopago' && mpConfigurado()) {
      try {
        const pref = await crearPreferencia({ pedido: r.pedido, datos, items })
        pago_url = pref.url
        // Se guarda para poder cruzar el pedido con el panel de Mercado
        // Pago aunque el webhook nunca llegue.
        await rpc('guardar_preferencia', {
          p_pedido_id: r.pedido.id,
          p_preference_id: pref.id,
        }).catch(e => console.error('[pedido] no se pudo guardar la preferencia', e))
      } catch (err) {
        console.error(`[pedido] no se pudo crear la preferencia de ${r.pedido.numero}`, err)
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(201).json({
      ok: true,
      pedido: r.pedido,
      pago_url,
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
