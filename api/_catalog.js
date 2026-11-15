// ── Catálogo ──────────────────────────────────────────────────
// El catálogo vive en la tabla "productos" de Supabase y la dueña lo
// maneja desde el panel (/panel → Productos). Lo usan /api/products,
// /api/page, /api/shop, /api/sitemap y /api/pedido.
//
// La planilla quedó solo para importar el catálogo la primera vez. Lo
// que sigue sobre el CSV aplica a esa importación.
//
// Por qué la planilla se lee en el servidor:
// la URL del Sheet publicado incluye la columna "Precio costo". Si el
// navegador es quien la descarga, esa URL viaja en el bundle y
// cualquiera puede abrirla y ver los márgenes, el stock y los
// productos que todavía no están publicados. Acá la URL vive solo en
// la variable de entorno SHEET_CSV_URL y nunca sale del servidor.
//
// ⚠️ Esto no alcanza por sí solo: el Sheet tiene que dejar de publicar
// la columna de costo. Ver README → "Catálogo y precios".
//
// Los archivos de api/ que empiezan con "_" no son endpoints: Vercel
// los ignora al armar las rutas.

import { rpc } from './_supabase.js'

// Se lee dentro de la función y no al cargar el módulo: así, si la
// variable se carga en Vercel después del build, alcanza con redeployar
// sin que quede un valor viejo capturado en una lambda tibia.
const csvUrl = () => process.env.SHEET_CSV_URL

// ── Parser CSV ────────────────────────────────────────────────
// Máquina de estados: soporta comas, saltos de línea y comillas
// escapadas ("") dentro de un campo entrecomillado.
export function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') { inQuotes = true }
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch !== '\r') { field += ch }
  }
  row.push(field)
  rows.push(row)

  const cells = rows.filter(r => r.some(c => c.trim() !== ''))
  if (cells.length < 2) return []

  const headers = cells[0].map(h => h.trim())
  return cells.slice(1).map(values => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim() })
    return obj
  })
}

// ── Normalización ─────────────────────────────────────────────
const NAME_CORRECTIONS = {
  'basic gold': 'Basic Gold', 'basic silver': 'Basic Silver', 'mini silver': 'Mini Silver',
  'mini gold': 'Mini Gold', 'curly white': 'Curly White', 'cubic': 'Cubic', 'star cubic': 'Star Cubic',
  'colorful rainbow': 'Colorful Rainbow', 'pop love violeta': 'Pop Love Violeta', 'argolla love': 'Argolla Love',
  'spark white': 'Spark White', 'aubrey': 'Aubrey', 'white cori': 'White Cori', 'nudo malik': 'Nudo Malik',
  'phoebe': 'Phoebe', 'colorful alena': 'Colorful Alena', 'colorful tabita': 'Colorful Tabita',
  'shiny storm': 'Shiny Storm', 'lita': 'Lita', 'baris': 'Baris', 'kylie shiny': 'Kylie Shiny',
  'drop silver': 'Drop Silver', 'dots gold': 'Dots Gold', 'chain silver': 'Chain Silver',
  'tourbillon': 'Tourbillón', 'veneciana': 'Veneciana',
  'susano cubic': 'Susano Cubic', 'susano ambar': 'Susano Ámbar',
  'gummy bear': 'Gummy Bear', 'stella': 'Stella', 'baly red': 'Baly Red', 'baly aqua': 'Baly Aqua',
  'verai lila': 'Verai Lila', 'verai celeste': 'Verai Celeste', 'laila green': 'Laila Green',
  'laila blue': 'Laila Blue', 'tennis white': 'Tennis White', 'tennis knot': 'Tennis Knot',
  'tennis doble': 'Tennis Doble', 'tennis dark': 'Tennis Dark', 'tennis heart': 'Tennis Heart',
  'cristal eye': 'Cristal Eye', 'malaquita verde': 'Malaquita Verde', 'malaquita negra': 'Malaquita Negra',
  'sia': 'Sia', 'lina': 'Lina', 'heart': 'Heart', 'conjunto love': 'Conjunto Love',
  'eclectic moon': 'Eclectic Moon', 'shiny heart silver': 'Shiny Heart Silver',
}

const CATEGORY_MAP = [
  { keys: ['argolla'], canonical: 'Argolla' },
  { keys: ['pasante'], canonical: 'Pasante' },
  { keys: ['cuff', 'cuffs'], canonical: 'Cuff' },
  { keys: ['cadena', 'collar', 'conjunto', 'corbatero'], canonical: 'Collar' },
  { keys: ['choker', 'chokers'], canonical: 'Choker' },
  { keys: ['dije'], canonical: 'Dije' },
  { keys: ['ajustable', 'pulsera', 'tennis'], canonical: 'Pulsera' },
  { keys: ['anillo'], canonical: 'Anillo' },
  { keys: ['broche'], canonical: 'Broche' },
  { keys: ['abridor'], canonical: 'Abridor' },
]

// Los aritos se venden de a pares y no por unidad. Es una propiedad de la
// pieza, no de qué celda de la planilla esté cargada: por eso la lista va
// acá y no se deduce de "Precio Par".
const DE_A_PARES = ['Argolla', 'Pasante', 'Abridor']

export const esDeAPares = category => DE_A_PARES.includes(category)

const CATEGORY_EMOJI = {
  Argolla: '💍', Pasante: '✨', Cuff: '⛓️',
  Collar: '🔗', Dije: '⭐', Pulsera: '💎', Anillo: '💍',
}

const COMBINING_MARKS = /[̀-ͯ]/g

const toTitleCase = str =>
  str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

const stripAccents = s => s.normalize('NFD').replace(COMBINING_MARKS, '')

function correctName(raw = '') {
  const key = stripAccents(raw.trim().toLowerCase()).replace(/\s+/g, ' ')
  return NAME_CORRECTIONS[key] || toTitleCase(raw.trim())
}

// ── Fotos ─────────────────────────────────────────────────────
// La pieza puede tener varias. "Imagen" es la principal, y las demás se
// reconocen por el nombre de la columna:
//
//   Imagen 2, Imagen 3...              numeradas
//   Imagen Puesto, Imagen Detalle...   con nombre, como las llama la guía
//
// Las dos formas valen, porque la planilla la edita una persona: se leen
// sin acentos ni mayúsculas, con o sin espacio, y también en inglés.
//
// El orden: primero la principal, después las numeradas por su número, y
// al final las que tienen nombre, en el orden en que estén las columnas
// en la planilla.
//
// "Imagen conjunto" es la excepción: no es una foto más de la pieza sino
// la del dije y la cadena puestos juntos, así que no entra en la galería
// y sale aparte, en imageCombo. Ver fotoDelConjunto.
const COLUMNA_DE_FOTO = /^(imagen|image|foto)\s*(\d*)\s*([a-z]*)$/
const ES_FOTO_DE_CONJUNTO = /^(imagen|image|foto)\s*conjunto$/

function fotosDeLaFila(row) {
  const encontradas = []
  let posicion = 0

  for (const [columna, valor] of Object.entries(row)) {
    posicion += 1
    const limpio = String(valor || '').trim()
    if (!limpio) continue

    const nombreColumna = stripAccents(String(columna).trim().toLowerCase())
    if (ES_FOTO_DE_CONJUNTO.test(nombreColumna)) continue

    const m = nombreColumna.match(COLUMNA_DE_FOTO)
    if (!m) continue

    const [, , numero, nombre] = m
    // Sin número ni nombre es la principal; con número manda el número;
    // con nombre van al final, respetando el orden de las columnas.
    const orden = nombre ? 1000 + posicion : Number(numero || 0)

    encontradas.push({ orden, url: limpio })
  }

  encontradas.sort((a, b) => a.orden - b.orden)
  // Repetir la misma foto dos veces es un error de copiado, no una foto más.
  return [...new Set(encontradas.map(f => f.url))]
}

// La foto del dije y la cadena puestos juntos, para ofrecer el conjunto
// con la imagen de lo que se lleva y no con la de la cadena sola.
//
// Va en la fila de la cadena, al lado de su "Precio conjunto". Es
// opcional: sin ella se muestra la foto de la cadena, como hasta ahora.
function fotoDelConjunto(row) {
  for (const [columna, valor] of Object.entries(row)) {
    const limpio = String(valor || '').trim()
    if (!limpio) continue
    if (ES_FOTO_DE_CONJUNTO.test(stripAccents(String(columna).trim().toLowerCase()))) return limpio
  }
  return ''
}

// "pulsera" -> "Pulsera". La planilla mezcla mayúsculas y minúsculas.
const titulo = texto => {
  const limpio = String(texto || '').trim()
  return limpio ? limpio[0].toUpperCase() + limpio.slice(1) : ''
}

// Lo que se ve debajo del nombre: "Argolla 9mm", "Collar gamuza".
//
// Sale de la columna "Categoría", que la escribe una persona y viene como
// venga: un tercio del catálogo la tenía en minúscula y se leía "pulsera"
// abajo del título, en la pestaña del navegador y en el carrito.
//
// "IND" es una anotación interna —la pieza se vende individual— que no
// significa nada para quien compra y aparecía tal cual en dos cuffs.
//
// Ojo: la dirección de la pieza NO sale de acá sino de la columna cruda,
// así que esto no cambia ningún link que ya esté dando vueltas.
const subcategoriaVisible = raw =>
  titulo(String(raw || '').replace(/\bIND\b/g, '').replace(/\s+/g, ' ').trim())

function normalizeCategory(raw = '') {
  const s = raw.trim().toLowerCase()
  if (!s) return 'Otros'
  for (const { keys, canonical } of CATEGORY_MAP) {
    if (keys.some(k => s.includes(k))) return canonical
  }
  return toTitleCase(raw.trim())
}

// Los materiales que entiende la tienda: el filtro, el cartel de la
// tarjeta y el texto de la ficha salen de esta lista.
export const MATERIALES = ['Plata', 'Plata Dorada', 'Acero Blanco', 'Bijou']

function normalizeMaterial(raw = '') {
  const s = raw.trim().toLowerCase()
  if (s === 'plata') return 'Plata'
  if (s === 'plata dorada' || s === 'oro') return 'Plata Dorada'
  if (s === 'acero' || s === 'acero blanco') return 'Acero Blanco'
  return 'Bijou'
}

const toNumber = raw => {
  const n = parseFloat(String(raw || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

// El slug es la dirección pública de la pieza, así que tiene que ser
// estable: si cambia, se pierde el posicionamiento y los links viejos.
// Sale del nombre y la subcategoría; si dos piezas coinciden, desempata
// el código del Sheet.
export function slugify(str = '') {
  return stripAccents(String(str).toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}

// ⚠️ "Precio costo" se lee del CSV pero NUNCA entra en el objeto que
// se devuelve. Si agregás campos acá, revisá que no lo arrastres.
//
// Desde que el catálogo vive en Supabase, esto solo se usa para la
// importación inicial desde la planilla (ver _productos.js).
function rowToProduct(row) {
  const stock = parseFloat(row['Stock']) || 0
  if (stock <= 0) return null
  return filaAProducto(row)
}

// Lo mismo, pero sin descartar las piezas sin stock: al importar entran
// todas, con stock 0, para que la dueña las tenga en el panel y las
// reponga cuando vuelvan.
export function filaAProducto(row) {
  const stock = Math.max(0, Math.floor(parseFloat(row['Stock']) || 0))

  const id = (row['Id'] || '').trim()
  if (!id) return null // sin código no se puede pedir por WhatsApp ni deduplicar el carrito

  const rawCategory = (row['Categoría'] || row['Categoria'] || '').trim()
  const category = normalizeCategory(rawCategory)

  // Los aritos se venden solo de a pares, así que su precio sale siempre de
  // "Precio Par" y nunca de "Precio individual": si un día esa celda
  // quedara cargada por error, cobraríamos un par al precio de uno.
  //
  // Al revés no aplica: todo lo demás —collares, pulseras, dijes— se vende
  // por unidad y usa "Precio individual", que son 82 de las 103 piezas.
  const pricePar = toNumber(row['Precio Par'])
  const price = esDeAPares(category) ? pricePar : (pricePar || toNumber(row['Precio individual']))
  if (!price) return null

  const promo = toNumber(row['Precio promo'] || row['precio promo'] || row['Promo'])
  const conjunto = toNumber(row['Precio conjunto'] || row['precio conjunto'] || row['Precio Conjunto'])
  const destacado = (row['Destacado'] || row['destacado'] || '').trim().toLowerCase()
  const name = correctName(row['Nombre'] || '')
  const fotos = fotosDeLaFila(row)

  // Red de seguridad: si la planilla no trae nombre, la pieza aparecía en
  // blanco en la grilla, en el carrito y en el título de su propia ficha.
  //
  // Va con el código pegado porque si no ocho pulseras se llamaban todas
  // "Pulsera": cuatro tarjetas idénticas al mismo precio, imposibles de
  // distinguir en la grilla y peor en el carrito, donde decía "1x Pulsera".
  //
  // La dirección de la pieza se arma con el nombre de la planilla, no con
  // este, así que ponerle el código no le cambia el link a nadie.
  const nombreVisible = name || `${subcategoriaVisible(rawCategory) || titulo(category) || 'Pieza'} ${id}`

  return {
    id,
    name: nombreVisible,
    category,
    subcategory: subcategoriaVisible(rawCategory),
    material: normalizeMaterial(row['Material']),
    price,
    pricePromo: promo && promo < price ? promo : null,
    // Precio de esta pieza cuando va en conjunto con un dije.
    //
    // Que la celda tenga un número es lo que la marca como cadena para
    // armar conjunto, aunque el número sea el mismo que el de lista: los
    // dijes no se venden solos, así que la cadena tiene que aparecer como
    // opción igual. Que además sea menor es lo que le pone el descuento.
    priceCombo: conjunto || null,
    // La foto del dije y la cadena juntos, si está cargada.
    imageCombo: fotoDelConjunto(row),
    priceNote: esDeAPares(category) ? 'par' : 'und',
    stock,
    image: fotos[0] || '',
    // Las demás fotos de la pieza, en el orden de las columnas.
    images: fotos,
    featured: ['si', 'sí', 'yes', '1', 'true'].includes(destacado),
    emoji: CATEGORY_EMOJI[category] || '✦',
    slug: slugify(rawCategory ? `${name} ${rawCategory}` : name),
  }
}

function ensureUniqueSlugs(products) {
  const seen = new Map()
  return products.map(p => {
    const base = p.slug || slugify(p.id)
    const n = seen.get(base) || 0
    seen.set(base, n + 1)
    // El primero se queda con el slug limpio para no romper links ya publicados.
    return n === 0 ? { ...p, slug: base } : { ...p, slug: `${base}-${slugify(p.id)}` }
  })
}

// ── Categorías ────────────────────────────────────────────────
// Las categorías tienen su propia dirección (/tienda/argollas), así que
// el slug de cada una también tiene que ser estable.
export const CATEGORY_LABELS = {
  Argolla: 'Argollas', Pasante: 'Pasantes', Cuff: 'Cuffs', Collar: 'Collares',
  Dije: 'Dijes', Pulsera: 'Pulseras', Anillo: 'Anillos', Choker: 'Chokers',
  Abridor: 'Abridores', Broche: 'Broches', Otros: 'Otros',
}

export const categoryLabel = c => CATEGORY_LABELS[c] || c + (c.endsWith('s') ? '' : 's')
export const categorySlug = c => slugify(categoryLabel(c))

// Devuelve la categoría canónica a partir de su slug, mirando las que
// realmente tienen piezas con stock.
export function categoryFromSlug(slug, products) {
  const cats = [...new Set(products.map(p => p.category))]
  return cats.find(c => categorySlug(c) === slug) || null
}

// ── De la base a la tienda ────────────────────────────────────
// La fila de la tabla "productos" convertida en lo que espera el
// navegador. Es la misma forma que salía de la planilla, así que nada
// del frontend se enteró del cambio.
//
// ⚠️ "precio_costo" está en la tabla pero NUNCA entra acá: es para el
// panel. Si agregás campos, revisá que no lo arrastres.
export function aProductoPublico(f) {
  const fotos = Array.isArray(f.fotos) ? f.fotos.filter(Boolean) : []
  const precio = Number(f.precio)
  const promo = f.precio_promo != null ? Number(f.precio_promo) : null
  return {
    id: f.id,
    name: f.nombre,
    category: f.categoria,
    subcategory: f.subcategoria || '',
    material: f.material,
    price: precio,
    pricePromo: promo && promo < precio ? promo : null,
    priceCombo: f.precio_conjunto != null ? Number(f.precio_conjunto) : null,
    imageCombo: f.foto_conjunto || '',
    priceNote: esDeAPares(f.categoria) ? 'par' : 'und',
    stock: Number(f.stock),
    image: fotos[0] || '',
    images: fotos,
    featured: Boolean(f.destacado),
    description: f.descripcion || '',
    emoji: CATEGORY_EMOJI[f.categoria] || '✦',
    slug: f.slug,
  }
}

let cache = null
const TTL = 60_000

// El catálogo vive en Supabase y lo maneja la dueña desde el panel.
//
// Se cachea en memoria mientras la función sigue tibia, para no pegarle
// a la base una vez por request: un cambio en el panel tarda hasta un
// minuto en verse (más lo que cachee Vercel, ver products.js).
//
// Si la base no contesta y hay una copia anterior en memoria, se sirve
// esa: mejor un catálogo de hace un rato que una tienda vacía.
export async function getCatalog({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.products

  let r
  try {
    r = await rpc('catalogo_publico', {})
  } catch (err) {
    if (cache) {
      console.error('[catalogo] la base no respondió; se sirve la copia anterior', err)
      return cache.products
    }
    throw err
  }

  // Red de seguridad para el pase: si la tabla está vacía es que todavía
  // no se importó la planilla, y la tienda sigue leyendo de ella. Una vez
  // que hay productos cargados, la planilla ya no se mira más.
  if (Number(r?.total) === 0 && csvUrl()) {
    console.warn('[catalogo] la tabla productos está vacía: se lee la planilla hasta que se importe')
    const products = await catalogoDeLaPlanilla()
    cache = { at: Date.now(), products }
    return products
  }

  const products = (r?.productos || []).map(aProductoPublico)
  cache = { at: Date.now(), products }
  return products
}

// Después de guardar en el panel, para que esta misma función no siga
// sirviendo la copia vieja.
export const invalidarCatalogo = () => { cache = null }

// ── La planilla ───────────────────────────────────────────────
// Solo para la importación inicial y como red de seguridad mientras la
// tabla esté vacía.
export async function leerPlanilla() {
  const url = csvUrl()
  if (!url) throw new Error('Falta la variable de entorno SHEET_CSV_URL')

  const res = await fetch(url, {
    headers: { 'User-Agent': 'lunare-catalog' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Sheet respondió ${res.status}`)
  return parseCSV(await res.text())
}

// Exactamente lo que publicaba la tienda antes del pase: las piezas con
// stock, con los slugs desempatados en el mismo orden. La importación
// parte de acá para que ningún link que ya esté dando vueltas cambie.
export async function catalogoDeLaPlanilla(filas = null) {
  filas = filas || await leerPlanilla()
  const products = ensureUniqueSlugs(filas.map(rowToProduct).filter(Boolean))
  avisarDeLoQueSeDescarto(filas, products)
  return products
}

// La planilla puede quedar de una forma que no rompe nada pero tampoco
// hace lo que la dueña espera. Sin estos avisos hay que salir a buscar
// por qué el sitio no muestra lo que ella ve cargado.
function avisarDeLoQueSeDescarto(filas, products) {
  if (!products.length) {
    console.error(
      `[catalogo] el Sheet trajo ${filas.length} filas y ninguna quedó publicable. ` +
      'Revisar que la pestaña publicada sea la del catálogo y que haya stock, Id y precio.'
    )
    return
  }

  // La cadena se ofrece igual, pero sin descuento: el conjunto sale lo
  // mismo que comprar las dos piezas por separado. Casi siempre es que se
  // copió el precio de lista en vez del de promo.
  const sinDescuento = filas.filter(row => {
    const conjunto = toNumber(row['Precio conjunto'] || row['precio conjunto'] || row['Precio Conjunto'])
    if (!conjunto) return false
    const precio = toNumber(row['Precio Par']) || toNumber(row['Precio individual'])
    return precio && conjunto >= precio
  })

  if (sinDescuento.length) {
    console.warn(
      `[catalogo] ${sinDescuento.length} pieza(s) tienen "Precio conjunto" igual o mayor al precio de lista, ` +
      'así que se ofrecen en conjunto pero sin descuento: ' +
      sinDescuento.map(r => (r['Id'] || '').trim()).join(', ')
    )
  }

  // "Material" se traduce contra una lista corta y lo que no está en ella
  // cae en Bijou. Hoy la planilla trae solo Plata, Plata Dorada, Acero
  // Blanco y bijou, y las cuatro salen bien; pero el día que alguien
  // escriba "Acero quirúrgico" o "Plata 925", esa pieza pasa a ser bijou
  // sin que nadie se entere: mal cartel, mal filtro y mal el texto del
  // material en la ficha.
  const materialesRaros = [...new Set(
    filas
      .map(r => (r['Material'] || '').trim())
      .filter(m => m && normalizeMaterial(m) === 'Bijou' && m.toLowerCase() !== 'bijou')
  )]

  if (materialesRaros.length) {
    console.warn(
      '[catalogo] la columna "Material" trae valores que no se reconocen y quedan como bijou: ' +
      materialesRaros.map(m => `"${m}"`).join(', ')
    )
  }
}

export const SITE_URL = process.env.SITE_URL || 'https://www.lunareacc.com'

export const formatPrice = n => '$' + Number(n).toLocaleString('es-AR')

// Cloudinary sirve la imagen ya recortada y en el formato que soporte
// el cliente; para compartir hace falta un JPG de 1200x630.
export function ogImage(url) {
  if (!url || !url.includes('/upload/')) return `${SITE_URL}/og-default.jpg`
  return url.replace('/upload/', '/upload/f_jpg,q_auto:good,w_1200,h_630,c_fill,g_center/')
}

export function productImage(url, w = 900) {
  if (!url || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto:good,w_${w},c_limit/`)
}
