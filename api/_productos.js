// ── Catálogo en el panel ──────────────────────────────────────
// Lo que la dueña hace desde /panel → Productos: ver, crear, editar,
// ocultar y borrar piezas, subir fotos, e importar la planilla la
// primera vez. Lo llama api/panel.js, que ya verificó la sesión.
//
// Todo lo que se guarda se valida acá, aunque el panel ya lo valide:
// el navegador no decide nada.
//
// El stock no se pisa: se suma la diferencia. Si la dueña abrió la ficha
// con 3 y mientras tanto entró un pedido que la dejó en 2, al guardar 5
// queda 4 y no 5. Si no fuera así, guardar una ficha abierta hace rato
// podría devolver al stock piezas que ya se vendieron.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { createHash } from 'node:crypto'
import { rpc } from './_supabase.js'
import {
  CATEGORY_LABELS, MATERIALES, slugify, filaAProducto, leerPlanilla,
  catalogoDeLaPlanilla, invalidarCatalogo,
} from './_catalog.js'

export const CATEGORIAS = Object.keys(CATEGORY_LABELS)

const ID = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,29}$/
const URL_FOTO = /^https:\/\/\S{8,500}$/
const MAX_FOTOS = 12

// Los precios se escriben a la argentina: "4.700" son cuatro mil
// setecientos, no cuatro coma siete. El punto es de miles y la coma, si
// aparece, es decimal.
const entero = v => {
  if (v === '' || v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : NaN
  const limpio = String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  if (!limpio) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? Math.round(n) : NaN
}
const texto = (v, max) => String(v ?? '').trim().slice(0, max)

// ── Validar una pieza ─────────────────────────────────────────

export function validarProducto(p = {}) {
  const errores = []
  const err = (campo, codigo) => errores.push({ campo, codigo })

  const id = texto(p.id, 30)
  const nombre = texto(p.nombre, 80)
  const categoria = texto(p.categoria, 30)
  const subcategoria = texto(p.subcategoria, 60)
  const material = texto(p.material, 30)
  const descripcion = texto(p.descripcion, 2000)
  const precio = entero(p.precio)
  const precio_promo = entero(p.precio_promo)
  const precio_conjunto = entero(p.precio_conjunto)
  const precio_costo = entero(p.precio_costo)
  const stock = entero(p.stock)
  const foto_conjunto = texto(p.foto_conjunto, 500)
  const fotos = (Array.isArray(p.fotos) ? p.fotos : [])
    .map(f => texto(f, 500))
    .filter(Boolean)

  if (!ID.test(id)) err('id', 'CODIGO_INVALIDO')
  if (nombre.length < 2) err('nombre', 'NOMBRE_REQUERIDO')
  if (!CATEGORIAS.includes(categoria)) err('categoria', 'CATEGORIA_INVALIDA')
  if (!MATERIALES.includes(material)) err('material', 'MATERIAL_INVALIDO')

  if (!Number.isInteger(precio) || precio < 1 || precio > 10_000_000) err('precio', 'PRECIO_INVALIDO')
  if (precio_promo !== null) {
    if (!Number.isInteger(precio_promo) || precio_promo < 1) err('precio_promo', 'PRECIO_INVALIDO')
    else if (Number.isInteger(precio) && precio_promo >= precio) err('precio_promo', 'PROMO_NO_ES_MENOR')
  }
  if (precio_conjunto !== null && (!Number.isInteger(precio_conjunto) || precio_conjunto < 1)) {
    err('precio_conjunto', 'PRECIO_INVALIDO')
  }
  if (precio_costo !== null && (!Number.isInteger(precio_costo) || precio_costo < 0)) {
    err('precio_costo', 'PRECIO_INVALIDO')
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > 9999) err('stock', 'STOCK_INVALIDO')

  if (fotos.length > MAX_FOTOS) err('fotos', 'DEMASIADAS_FOTOS')
  if (fotos.some(f => !URL_FOTO.test(f))) err('fotos', 'FOTO_INVALIDA')
  if (foto_conjunto && !URL_FOTO.test(foto_conjunto)) err('foto_conjunto', 'FOTO_INVALIDA')

  return {
    errores,
    producto: {
      id, nombre, categoria, subcategoria, material, descripcion,
      precio, precio_promo, precio_conjunto, precio_costo, stock,
      fotos: [...new Set(fotos)],
      foto_conjunto,
      destacado: Boolean(p.destacado),
      publicado: p.publicado !== false,
    },
  }
}

// ── Acciones ──────────────────────────────────────────────────

export async function listarProductosPanel() {
  const [productos, ultima] = await Promise.all([
    rpc('productos_panel', {}),
    // Si la migración de la sincronización todavía no se corrió, el panel
    // anda igual: solo no muestra cuándo fue la última.
    rpc('ultima_sincronizacion', {}).catch(() => null),
  ])
  return {
    productos: productos || [],
    ultima_sincronizacion: ultima || null,
    categorias: CATEGORIAS,
    materiales: MATERIALES,
    fotos_configuradas: fotosConfiguradas(),
    planilla_configurada: Boolean(process.env.SHEET_CSV_URL),
  }
}

async function guardar(body) {
  const nuevo = body.nuevo === true
  const { errores, producto } = validarProducto(body.producto)
  if (errores.length) return { ok: false, status: 400, cuerpo: { ok: false, error: 'DATOS_INVALIDOS', errores } }

  // La dirección pública de la pieza. Solo se arma al crearla: después no
  // cambia aunque cambie el nombre, para no romper links ni posicionamiento.
  const slug = nuevo ? slugify(`${producto.nombre} ${producto.subcategoria || producto.categoria}`) : null

  const stockAnterior = entero(body.stock_anterior)
  if (!nuevo && !Number.isInteger(stockAnterior)) {
    return { ok: false, status: 400, cuerpo: { ok: false, error: 'FALTA_STOCK_ANTERIOR' } }
  }

  const r = await rpc('guardar_producto', {
    p_producto: { ...producto, slug },
    p_nuevo: nuevo,
    p_stock_anterior: nuevo ? null : stockAnterior,
  })
  if (r?.ok) invalidarCatalogo()
  return { ok: Boolean(r?.ok), status: r?.ok ? 200 : 409, cuerpo: r }
}

async function borrar(body) {
  const id = texto(body.id, 30)
  if (!ID.test(id)) return { ok: false, status: 400, cuerpo: { ok: false, error: 'CODIGO_INVALIDO' } }
  const r = await rpc('borrar_producto', { p_id: id })
  if (r?.ok) invalidarCatalogo()
  return { ok: Boolean(r?.ok), status: r?.ok ? 200 : 409, cuerpo: r }
}

// ── Actualizar desde la planilla ──────────────────────────────
// La dueña puede traer la planilla al panel cuando quiera. Se hace en dos
// pasos para que nunca pise algo sin avisar:
//
//   revisar_planilla   lee la planilla y dice qué cambiaría: piezas
//                      nuevas, cuáles cambian y en qué, cuáles quedan igual.
//                      No guarda nada.
//   aplicar_planilla   lo guarda (sincronizar_productos en la base).
//
// La planilla manda en nombre, categoría, medida, material, precios,
// fotos, destacada y stock. Lo que es solo del panel —la descripción, si
// está visible, su dirección— no se toca, y tampoco las piezas que están
// en el panel y no en la planilla.

const sinPlanilla = () => ({ ok: false, status: 503, cuerpo: { ok: false, error: 'PLANILLA_NO_CONFIGURADA' } })
const planillaCaida = () => ({ ok: false, status: 502, cuerpo: { ok: false, error: 'PLANILLA_NO_DISPONIBLE' } })

// Lee la planilla y la deja con la forma de la tabla "productos".
async function productosDeLaPlanilla() {
  const filas = await leerPlanilla()

  // La planilla publicada ya no trae el costo (se sacó para que no se
  // filtre). Si no está la columna, no se manda: así no se borra el que
  // se cargó en el panel.
  const tieneCosto = filas.length > 0 && Object.keys(filas[0]).some(k => /^precio\s*costo$/i.test(k.trim()))

  // Las piezas que hoy están publicadas se quedan con su dirección de
  // siempre. Las demás (sin stock) reciben una que no choque con nadie.
  const publicadas = await catalogoDeLaPlanilla(filas)
  const slugPorId = new Map(publicadas.map(p => [p.id, p.slug]))
  const usados = new Set(publicadas.map(p => p.slug))

  // Un código puede estar repetido en la planilla: a veces es la misma
  // pieza cargada dos veces (una fila sin stock y otra con), y a veces son
  // dos piezas distintas con el mismo código. En la base el código es
  // único, así que entra una sola: la que hoy está publicada, o si
  // ninguna lo está, la primera. Las demás se informan para que la dueña
  // decida.
  const filasPorId = new Map()
  filas.forEach((fila, orden) => {
    const p = filaAProducto(fila)
    if (!p) return
    if (!filasPorId.has(p.id)) filasPorId.set(p.id, [])
    filasPorId.get(p.id).push({ p, fila, orden })
  })

  const repetidos = []
  const elegidas = []
  for (const [id, candidatas] of filasPorId) {
    const publicada = candidatas.find(c => slugPorId.has(id) && c.p.stock > 0)
    const elegida = publicada || candidatas[0]
    elegidas.push(elegida)
    if (candidatas.length > 1) {
      const otras = candidatas.filter(c => c !== elegida)
      repetidos.push({
        id,
        entro: elegida.p.name,
        // Si el nombre es el mismo es una fila duplicada y no se pierde
        // nada; si es otro, es una pieza distinta que hay que cargar con
        // otro código.
        quedaron_afuera: otras
          .filter(c => c.p.name.toLowerCase() !== elegida.p.name.toLowerCase())
          .map(c => c.p.name),
      })
    }
  }
  elegidas.sort((a, b) => a.orden - b.orden)

  const productos = elegidas.map(({ p, fila, orden }) => {
    let slug = slugPorId.get(p.id)
    if (!slug) {
      const base = p.slug || slugify(p.id)
      slug = usados.has(base) ? `${base}-${slugify(p.id)}` : base
      usados.add(slug)
    }
    const fila_ = {
      id: p.id,
      nombre: p.name,
      categoria: p.category,
      subcategoria: p.subcategory || '',
      material: p.material,
      precio: p.price,
      precio_promo: p.pricePromo,
      precio_conjunto: p.priceCombo,
      stock: p.stock,
      fotos: p.images,
      foto_conjunto: p.imageCombo || '',
      destacado: p.featured,
      slug,
      orden,
    }
    if (tieneCosto) {
      const costo = entero(fila['Precio costo'] ?? fila['Precio Costo'] ?? fila['precio costo'])
      fila_.precio_costo = Number.isInteger(costo) && costo >= 0 ? costo : null
    }
    return fila_
  })

  return { productos, repetidos, tieneCosto }
}

const plata = n => (n == null ? 'sin' : '$' + Number(n).toLocaleString('es-AR'))
const siNo = v => (v ? 'sí' : 'no')

// Qué cambia en una pieza, en palabras: "Precio: $4.700 → $5.200".
function diferencias(actual, nueva, stockNuevo, tieneCosto) {
  const campos = []
  const cmp = (etiqueta, a, b, fmt = x => (x == null || x === '' ? '—' : String(x))) => {
    const va = a ?? null
    const vb = b ?? null
    if ((va === '' ? null : va) !== (vb === '' ? null : vb)) campos.push({ campo: etiqueta, antes: fmt(va), despues: fmt(vb) })
  }
  cmp('Nombre', actual.nombre, nueva.nombre)
  cmp('Precio', actual.precio, nueva.precio, plata)
  cmp('Promo', actual.precio_promo, nueva.precio_promo, plata)
  cmp('Stock', actual.stock, stockNuevo)
  cmp('Categoría', actual.categoria, nueva.categoria)
  cmp('Medida', actual.subcategoria, nueva.subcategoria)
  cmp('Material', actual.material, nueva.material)
  cmp('Precio en conjunto', actual.precio_conjunto, nueva.precio_conjunto, plata)
  cmp('Destacada', Boolean(actual.destacado), Boolean(nueva.destacado), siNo)
  if (JSON.stringify(actual.fotos || []) !== JSON.stringify(nueva.fotos || [])) {
    const a = (actual.fotos || []).length
    const b = (nueva.fotos || []).length
    campos.push({ campo: 'Fotos', antes: `${a}`, despues: a === b ? `${b} (otras)` : `${b}` })
  }
  cmp('Foto del conjunto', actual.foto_conjunto || '', nueva.foto_conjunto || '', v => (v ? 'cargada' : '—'))
  if (tieneCosto) cmp('Costo', actual.precio_costo, nueva.precio_costo, plata)
  return campos
}

async function revisarPlanilla() {
  if (!process.env.SHEET_CSV_URL) return sinPlanilla()

  let planilla
  try {
    planilla = await productosDeLaPlanilla()
  } catch (err) {
    console.error('[productos] no se pudo leer la planilla', err)
    return planillaCaida()
  }

  const [enBase, reservado] = await Promise.all([
    rpc('productos_panel', {}),
    rpc('stock_reservado', {}),
  ])
  const actuales = new Map((enBase || []).map(p => [p.id, p]))

  const nuevas = []
  const cambios = []
  let iguales = 0
  for (const p of planilla.productos) {
    const stockNuevo = Math.max(0, p.stock - Number(reservado?.[p.id] || 0))
    const actual = actuales.get(p.id)
    if (!actual) {
      nuevas.push({ id: p.id, nombre: p.nombre, precio: p.precio, stock: stockNuevo, foto: p.fotos?.[0] || '' })
      continue
    }
    const campos = diferencias(actual, p, stockNuevo, planilla.tieneCosto)
    if (campos.length) cambios.push({ id: p.id, nombre: actual.nombre, foto: actual.fotos?.[0] || '', campos })
    else iguales += 1
  }

  const enPlanilla = new Set(planilla.productos.map(p => p.id))
  const soloEnPanel = (enBase || []).filter(p => !enPlanilla.has(p.id)).map(p => ({ id: p.id, nombre: p.nombre }))

  return {
    ok: true,
    cuerpo: {
      ok: true,
      nuevas,
      cambios,
      iguales,
      solo_en_panel: soloEnPanel,
      repetidos: planilla.repetidos,
      hay_reservas: Object.keys(reservado || {}).length > 0,
    },
  }
}

async function aplicarPlanilla() {
  if (!process.env.SHEET_CSV_URL) return sinPlanilla()

  let planilla
  try {
    planilla = await productosDeLaPlanilla()
  } catch (err) {
    console.error('[productos] no se pudo leer la planilla', err)
    return planillaCaida()
  }

  const r = await rpc('sincronizar_productos', { p_productos: planilla.productos })
  invalidarCatalogo()
  return { ok: true, cuerpo: { ...r, ok: true, repetidos: planilla.repetidos } }
}

// ── Fotos ─────────────────────────────────────────────────────
// Las fotos van a Cloudinary, como las que ya tiene la tienda. El
// navegador las sube directo, con una firma que da el servidor: así el
// archivo no pasa por Vercel y el secreto de Cloudinary no sale de acá.
//
//   CLOUDINARY_CLOUD_NAME=dtbasr3hw
//   CLOUDINARY_API_KEY=...
//   CLOUDINARY_API_SECRET=...
//
// Sin estas variables el panel igual deja pegar el link de una foto.

const CARPETA = 'lunare/productos'

function fotosConfiguradas() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  )
}

async function firmaFoto() {
  if (!fotosConfiguradas()) {
    return { ok: false, status: 503, cuerpo: { ok: false, error: 'FOTOS_NO_CONFIGURADAS' } }
  }
  const timestamp = Math.floor(Date.now() / 1000)
  // Cloudinary firma los parámetros ordenados alfabéticamente, unidos con
  // "&", con el secreto pegado al final.
  const aFirmar = `folder=${CARPETA}&timestamp=${timestamp}`
  const signature = createHash('sha1').update(aFirmar + process.env.CLOUDINARY_API_SECRET).digest('hex')

  return {
    ok: true,
    cuerpo: {
      ok: true,
      cloud: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      folder: CARPETA,
      timestamp,
      signature,
    },
  }
}

// Lo que api/panel.js despacha por "tipo".
export const ACCIONES_PRODUCTOS = {
  producto: guardar,
  borrar_producto: borrar,
  revisar_planilla: revisarPlanilla,
  aplicar_planilla: aplicarPlanilla,
  firma_foto: firmaFoto,
}
