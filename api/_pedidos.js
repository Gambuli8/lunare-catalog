// ── Pedidos ───────────────────────────────────────────────────
// Habla con Supabase con la service role key, que solo vive en el
// servidor. La clave nunca llega al navegador y las tablas tienen RLS
// sin políticas, así que las claves públicas no leen nada.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

const url = () => process.env.SUPABASE_URL
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY

export function pedidosConfigurados() {
  return Boolean(url() && key())
}

async function rpc(fn, args) {
  const res = await fetch(`${url()}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key(),
      Authorization: `Bearer ${key()}`,
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10000),
  })
  const texto = await res.text()
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${texto.slice(0, 300)}`)
  return texto ? JSON.parse(texto) : null
}

// ── Entregas ──────────────────────────────────────────────────
// El costo se decide acá, en el servidor. Si viniera del navegador,
// cualquiera podría mandar un envío de $0.
//
// ⚠️ Tarifas provisorias hasta conectar la API del correo, que las
// calcula por código postal y peso. Ver README → "Pedidos y pagos".
export const ENTREGAS = {
  retiro_santa_rosa: { etiqueta: 'Retiro en Santa Rosa, La Pampa', costo: 0, envio: false },
  retiro_cordoba:    { etiqueta: 'Retiro en Nueva Córdoba', costo: 0, envio: false },
  envio:             { etiqueta: 'Envío a domicilio', costo: 6800, envio: true },
}

export const PAGOS = {
  mercadopago:   { etiqueta: 'Mercado Pago' },
  transferencia: { etiqueta: 'Transferencia bancaria' },
  efectivo:      { etiqueta: 'Efectivo al retirar', soloRetiro: true },
}

export const ENVIO_GRATIS_DESDE = 60000

export function costoEnvio(entrega, subtotal) {
  const def = ENTREGAS[entrega]
  if (!def || !def.envio) return 0
  return subtotal >= ENVIO_GRATIS_DESDE ? 0 : def.costo
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
