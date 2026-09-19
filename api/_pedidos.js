// ── Pedidos ───────────────────────────────────────────────────
// El pegamento con la base vive en _supabase.js, que también usan los
// arrepentimientos.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { rpc, supabaseConfigurado } from './_supabase.js'
import { cotizar } from './_envios.js'

export const pedidosConfigurados = supabaseConfigurado

// ── Entregas ──────────────────────────────────────────────────
// El costo se decide acá, en el servidor. Si viniera del navegador,
// cualquiera podría mandar un envío de $0.
//
// El precio del envío sale de la pestaña "Envios" del Sheet, por código
// postal y por transporte. Ver _envios.js.
//
// Acá está solo la modalidad; qué transporte eligió la clienta
// —Andreani, Correo Argentino, Integral Pack— se guarda aparte, en la
// columna "transporte" del pedido, porque los transportes se agregan y
// se sacan desde el Sheet.
//
// "envio" es a domicilio y se llama así desde el principio: los pedidos
// viejos ya guardados con ese valor siguen siendo válidos.
export const ENTREGAS = {
  retiro_santa_rosa: { etiqueta: 'Retiro en Santa Rosa, La Pampa', costo: 0, envio: false },
  retiro_cordoba:    { etiqueta: 'Retiro en Nueva Córdoba', costo: 0, envio: false },
  envio:             { etiqueta: 'Envío a domicilio', envio: true, modo: 'domicilio' },
  envio_sucursal:    { etiqueta: 'Envío a sucursal', envio: true, modo: 'sucursal' },
}

export const PAGOS = {
  mercadopago:   { etiqueta: 'Mercado Pago' },
  transferencia: { etiqueta: 'Transferencia bancaria' },
  efectivo:      { etiqueta: 'Efectivo al retirar', soloRetiro: true },
}

export const ENVIO_GRATIS_DESDE = 60000

// Devuelve qué se cobra de envío, o por qué no se puede cobrar. El
// navegador muestra un precio, pero el que vale es este: si viniera del
// carrito, cualquiera podría mandar un envío de $0 o elegir el precio de
// Integral Pack y hacerse despachar por Andreani.
export async function resolverEnvio({ entrega, transporte, subtotal, cp }) {
  const def = ENTREGAS[entrega]
  if (!def) return { ok: false, codigo: 'ENTREGA_INVALIDA' }
  if (!def.envio) return { ok: true, costo: 0 }

  const opciones = await cotizar(cp)
  if (!opciones.length) return { ok: false, codigo: 'CP_SIN_COBERTURA' }

  // Tiene que existir esa combinación de transporte y modalidad para ese
  // código postal, no alcanza con que el transporte exista.
  const elegida = opciones.find(o => o.entrega === entrega && o.transporte === transporte)
  if (!elegida) return { ok: false, codigo: 'ENVIO_NO_DISPONIBLE' }

  const datos = { transporte: elegida.transporte, zona: elegida.zona, dias: elegida.dias }
  if (subtotal >= ENVIO_GRATIS_DESDE) return { ok: true, costo: 0, gratis: true, ...datos }

  return { ok: true, costo: elegida.costo, ...datos }
}

// Arma los ítems del pedido con los datos del catálogo, no con los que
// manda el navegador: el precio y el stock salen del servidor.
// Si no fuera así, alcanzaría con editar el JSON del pedido para
// comprarse una pieza a $1.
export function validarItems(carrito, catalogo) {
  const errores = []
  const items = []

  if (!Array.isArray(carrito) || carrito.length === 0) {
    return { errores: [{ codigo: 'PEDIDO_VACIO' }], items: [] }
  }
  if (carrito.length > 40) {
    return { errores: [{ codigo: 'DEMASIADOS_ITEMS' }], items: [] }
  }

  for (const linea of carrito) {
    const id = String(linea?.id || '').trim()
    const cantidad = Number.parseInt(linea?.qty, 10)

    if (!id) { errores.push({ codigo: 'ITEM_SIN_ID' }); continue }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
      errores.push({ codigo: 'CANTIDAD_INVALIDA', producto_id: id }); continue
    }

    const p = catalogo.find(x => x.id === id)
    if (!p) { errores.push({ codigo: 'SIN_STOCK', producto_id: id }); continue }

    items.push({
      producto_id: p.id,
      slug: p.slug,
      nombre: p.name,
      subcategoria: p.subcategory,
      material: p.material,
      imagen: p.image,
      precio_unitario: p.pricePromo ?? p.price,
      cantidad,
      stock_actual: p.stock,
    })
  }

  return { errores, items }
}

export function crearPedido(pedido, items) {
  return rpc('crear_pedido', { p_pedido: pedido, p_items: items })
}
