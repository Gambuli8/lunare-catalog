// ── /api/products ─────────────────────────────────────────────
// Lee el CSV del Google Sheet DEL LADO DEL SERVIDOR y devuelve el
// catálogo ya normalizado.
//
// Por qué existe este endpoint:
// la URL del Sheet publicado incluye la columna "Precio costo". Si el
// navegador es quien la descarga, esa URL viaja en el bundle y
// cualquiera puede abrirla y ver los márgenes, el stock y los
// productos que todavía no están publicados. Acá la URL vive solo en
// la variable de entorno SHEET_CSV_URL y nunca sale del servidor.
//
// ⚠️ Esto no alcanza por sí solo: el Sheet tiene que dejar de publicar
// la columna de costo. Ver README → "Catálogo y precios".

const CSV_URL = process.env.SHEET_CSV_URL

// ── Parser CSV ────────────────────────────────────────────────
// Máquina de estados: soporta comas, saltos de línea y comillas
// escapadas ("") dentro de un campo entrecomillado.
function parseCSV(text) {
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
]

const CATEGORY_EMOJI = {
  Argolla: '💍', Pasante: '✨', Cuff: '⛓️',
  Collar: '🔗', Dije: '⭐', Pulsera: '💎', Anillo: '💍',
}

const toTitleCase = str =>
  str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

const COMBINING_MARKS = /[̀-ͯ]/g

function correctName(raw = '') {
  const key = raw.trim().toLowerCase()
    .normalize('NFD').replace(COMBINING_MARKS, '').replace(/\s+/g, ' ')
  return NAME_CORRECTIONS[key] || toTitleCase(raw.trim())
}

function normalizeCategory(raw = '') {
  const s = raw.trim().toLowerCase()
  if (!s) return 'Otros'
  for (const { keys, canonical } of CATEGORY_MAP) {
    if (keys.some(k => s.includes(k))) return canonical
  }
  return toTitleCase(raw.trim())
}

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

// ⚠️ "Precio costo" se lee del CSV pero NUNCA entra en el objeto que
// se devuelve. Si agregás campos acá, revisá que no lo arrastres.
function rowToProduct(row) {
  const stock = parseFloat(row['Stock']) || 0
  if (stock <= 0) return null

  const id = (row['Id'] || '').trim()
  if (!id) return null // sin código no se puede pedir por WhatsApp ni deduplicar el carrito

  const pricePar = toNumber(row['Precio Par'])
  const priceInd = toNumber(row['Precio individual'])
  const price = pricePar || priceInd
  if (!price) return null

  const promo = toNumber(row['Precio promo'] || row['precio promo'] || row['Promo'])
  const rawCategory = (row['Categoría'] || row['Categoria'] || '').trim()
  const category = normalizeCategory(rawCategory)
  const destacado = (row['Destacado'] || row['destacado'] || '').trim().toLowerCase()

  return {
    id,
    name: correctName(row['Nombre'] || ''),
    category,
    subcategory: rawCategory,
    material: normalizeMaterial(row['Material']),
    price,
    pricePromo: promo && promo < price ? promo : null,
    priceNote: pricePar ? 'par' : 'und',
    stock,
    image: (row['Imagen'] || row['imagen'] || row['Image'] || '').trim(),
    featured: ['si', 'sí', 'yes', '1', 'true'].includes(destacado),
    emoji: CATEGORY_EMOJI[category] || '✦',
  }
}

export default async function handler(req, res) {
  if (!CSV_URL) {
    console.error('[products] falta la variable de entorno SHEET_CSV_URL')
    return res.status(500).json({ error: 'Catálogo no configurado' })
  }

  try {
    const upstream = await fetch(CSV_URL, {
      headers: { 'User-Agent': 'lunare-catalog' },
      signal: AbortSignal.timeout(10000),
    })
    if (!upstream.ok) throw new Error(`Sheet respondió ${upstream.status}`)

    const products = parseCSV(await upstream.text())
      .map(rowToProduct)
      .filter(Boolean)

    // El catálogo se edita a mano y cambia pocas veces por día: el CDN
    // sirve la copia cacheada y revalida por atrás, así una visita nunca
    // espera a Google Sheets.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600')
    return res.status(200).json({ products, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[products]', err)
    return res.status(502).json({ error: 'No pudimos leer el catálogo' })
  }
}
