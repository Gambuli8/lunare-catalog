import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────
// CONFIGURA AQUÍ tu URL pública de Google Sheets como CSV:
//   1. Abrí tu hoja en Google Sheets
//   2. Archivo → Compartir → Publicar en la web
//   3. Elegí la hoja y el formato "Valores separados por comas (.csv)"
//   4. Copiá la URL generada y pegala abajo
// ─────────────────────────────────────────────────────────────
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS6xogLCXqLvMy3wyrqgL_XqvcXG_PN3JuiqZCy6jYCWnTYwkDxkHYd3r40Df8G3dPk-lIg4kIXaBCX/pub?gid=0&single=true&output=csv'


// Columnas esperadas en el CSV (en este orden):
// Id | Nombre | Categoría | Material | Precio costo | Precio individual | Precio Par | Stock

// ── Emojis por categoría ──────────────────────────────────────
const CATEGORY_EMOJI = {
  Argolla: '💍',
  Pasante: '✨',
  Cuff:    '⛓️',
  Collar:  '🔗',
  Dije:    '⭐',
  Pulsera: '💎',
  Anillo:  '💍',
}

// ── Nombres corregidos con ortografía exacta ──────────────────
// Clave: nombre en minúsculas sin tildes · Valor: nombre correcto
const NAME_CORRECTIONS = {
  'basic gold':         'Basic Gold',
  'basic silver':       'Basic Silver',
  'mini silver':        'Mini Silver',
  'mini gold':          'Mini Gold',
  'curly white':        'Curly White',
  'cubic':              'Cubic',
  'star cubic':         'Star Cubic',
  'colorful rainbow':   'Colorful Rainbow',
  'pop love violeta':   'Pop Love Violeta',
  'argolla love':       'Argolla Love',
  'spark white':        'Spark White',
  'aubrey':             'Aubrey',
  'white cori':         'White Cori',
  'nudo malik':         'Nudo Malik',
  'phoebe':             'Phoebe',
  'colorful alena':     'Colorful Alena',
  'colorful tabita':    'Colorful Tabita',
  'shiny storm':        'Shiny Storm',
  'lita':               'Lita',
  'baris':              'Baris',
  'kylie shiny':        'Kylie Shiny',
  'drop silver':        'Drop Silver',
  'dots gold':          'Dots Gold',
  'chain silver':       'Chain Silver',
  'tourbillon':         'Tourbillón',
  'tourbillón':         'Tourbillón',
  'veneciana':          'Veneciana',
  'susano cubic':       'Susano Cubic',
  'susano ambar':       'Susano Ámbar',
  'susano ámbar':       'Susano Ámbar',
  'gummy bear':         'Gummy Bear',
  'stella':             'Stella',
  'baly red':           'Baly Red',
  'baly aqua':          'Baly Aqua',
  'verai lila':         'Verai Lila',
  'verai celeste':      'Verai Celeste',
  'laila green':        'Laila Green',
  'laila blue':         'Laila Blue',
  'tennis white':       'Tennis White',
  'tennis knot':        'Tennis Knot',
  'tennis doble':       'Tennis Doble',
  'tennis dark':        'Tennis Dark',
  'tennis heart':       'Tennis Heart',
  'cristal eye':        'Cristal Eye',
  'malaquita verde':    'Malaquita Verde',
  'malaquita negra':    'Malaquita Negra',
  'sia':                'Sia',
  'lina':               'Lina',
  'heart':              'Heart',
  'conjunto love':      'Conjunto Love',
  'eclectic moon':      'Eclectic Moon',
  'shiny heart silver': 'Shiny Heart Silver',
}

function correctName(raw = '') {
  const key = raw.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes para buscar
    .replace(/\s+/g, ' ')
  return NAME_CORRECTIONS[key] || toTitleCase(raw.trim())
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

// ── Normalización de categoría ────────────────────────────────
// Mapea cualquier variante del CSV a la clave canónica del filtro
const CATEGORY_MAP = [
  { keys: ['argolla'], canonical: 'Argolla' },
  { keys: ['pasante'], canonical: 'Pasante' },
  { keys: ['cuff', 'cuffs'], canonical: 'Cuff' },
  { keys: ['cadena', 'collar', 'conjunto', 'corbatero'], canonical: 'Collar' },
  { keys: ['choker', 'chokers'], canonical: 'Choker' },
  { keys: ['dije'], canonical: 'Dije' },
  { keys: ['ajustable', 'pulsera', 'tennis'], canonical: 'Pulsera' },
  { keys: ['anillo'], canonical: 'Anillo' },
  { keys: ['broche'], canonical: 'Broche' }
]

function normalizeCategory(raw = '') {
  const s = raw.trim().toLowerCase()
  if (!s) return 'Otros' // Maneja las categorías vacías del Excel
  for (const { keys, canonical } of CATEGORY_MAP) {
    if (keys.some(k => s.includes(k))) return canonical
  }
  return toTitleCase(raw.trim())
}

// ── Normalización de Material ────────────────────────────────
function normalizeMaterial(raw = '') {
  const s = raw.trim().toLowerCase()
  if (s === 'plata') return 'Plata'
  if (s === 'plata dorada') return 'Plata Dorada'
  if (s === 'acero' || s === 'acero blanco') return 'Acero Blanco' // se puede usar emtodo includes para Agrupa cualquier "Acero" acá
  return 'Biyu' // Todo lo demás (vacío, colores, etc) cae en Biyu
}

// ── Labels de categoría para los filtros ─────────────────────
const CATEGORY_LABELS = {
  Argolla: 'Argollas',
  Pasante: 'Pasantes',
  Cuff:    'Cuffs',
  Collar:  'Collares',
  Dije:    'Dijes',
  Pulsera: 'Pulseras',
  Anillo:  'Anillos',
}

// ── Parser CSV robusto (maneja comillas y comas internas) ─────
function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map(line => {
    const values = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    values.push(cur.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/^"|"$/g, '').trim() })
    return row
  })
}

// ── rowToProduct ──────────────────────────────────────────────
// ⚠️  Lee "Precio costo" pero NUNCA lo incluye en el objeto retornado
function rowToProduct(row) {
  // Filtrar sin stock
  const stock = parseFloat(row['Stock']) || 0
  if (stock <= 0) return null

  const rawCategory = row['Categoría'] || row['Categoria'] || ''
  const category = normalizeCategory(rawCategory)

  // Precio de venta: "Precio Par" tiene prioridad, luego "Precio individual"
  // "Precio costo" (columna E) se descarta deliberadamente
  const pricePar = parseFloat((row['Precio Par'] || '').replace(/[^0-9.]/g, ''))
  const priceInd = parseFloat((row['Precio individual'] || '').replace(/[^0-9.]/g, ''))
  const price = !isNaN(pricePar) && pricePar > 0 ? pricePar : !isNaN(priceInd) && priceInd > 0 ? priceInd : null

  if (!price) return null

  // Buscá la línea const material = ... y reemplazala por:
  const material = normalizeMaterial(row['Material'])
  const priceNote = !isNaN(pricePar) && pricePar > 0 ? 'par' : 'und'

  return {
    id: (row['Id'] || '').trim() || Math.random().toString(36).slice(2),
    name: correctName(row['Nombre'] || ''),
    category, // ← clave canónica para filtrar
    subcategory: rawCategory.trim(), // ← valor original para mostrar
    material,
    price,
    priceNote,
    emoji: CATEGORY_EMOJI[category] || '✦'
    // ⚠️  "Precio costo" NO está en este objeto
  }
}

// ── Hook principal ────────────────────────────────────────────
export function useProducts() {
  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([{ key: 'all', label: 'Todos' }])
  const [materials,  setMaterials]  = useState([{ key: 'all', label: 'Todos' }]) // NUEVO ESTADO
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()

      const rows  = parseCSV(text)
      const items = rows.map(rowToProduct).filter(Boolean)

      const seenCats = new Set()
      const seenMats = new Set() // NUEVO SET PARA MATERIALES
      const cats = [{ key: 'all', label: 'Todos' }]
      const mats = [{ key: 'all', label: 'Todos' }]

      items.forEach(p => {
        // Generador dinámico de Categorías
        if (!seenCats.has(p.category)) {
          seenCats.add(p.category)
          cats.push({
            key:   p.category,
            label: CATEGORY_LABELS[p.category] || p.category + (p.category.endsWith('s') ? '' : 's'),
          })
        }
        // Generador dinámico de Materiales
        if (!seenMats.has(p.material)) {
          seenMats.add(p.material)
          mats.push({ key: p.material, label: p.material })
        }
      })

      setProducts(items)
      setCategories(cats)
      setMaterials(mats) // GUARDAMOS LOS MATERIALES DINÁMICOS
    } catch (err) {
      setError(err.message || 'Error al cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  return { products, categories, materials, loading, error, refetch: fetchProducts }
}

export const formatPrice = (n) =>
  '$' + Number(n).toLocaleString('es-AR')
