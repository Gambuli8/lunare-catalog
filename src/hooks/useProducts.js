import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────
// CONFIGURA AQUÍ tu URL pública de Google Sheets como CSV:
//   1. Abrí tu hoja en Google Sheets
//   2. Archivo → Compartir → Publicar en la web
//   3. Elegí la hoja y el formato "Valores separados por comas (.csv)"
//   4. Copiá la URL generada y pegala abajo
// ─────────────────────────────────────────────────────────────
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS6xogLCXqLvMy3wyrqgL_XqvcXG_PN3JuiqZCy6jYCWnTYwkDxkHYd3r40Df8G3dPk-lIg4kIXaBCX/pub?gid=0&single=true&output=csv'

// Columnas esperadas en el CSV:
// Id | Nombre | Categoría | Material | Precio costo | Precio individual | Precio Par | Stock | Imagen
//
// ── IMÁGENES DESDE DROPBOX ───────────────────────────────────
// Agregá una columna "Imagen" en tu Google Sheets con la URL pública de Dropbox.
// Cambiá el final de cada link de ?dl=0 → ?raw=1 para que sea una URL directa.
// Ejemplo: https://www.dropbox.com/s/abc123/foto.jpg?raw=1
// Si una fila no tiene imagen, se mostrará el emoji como fallback.

const CATEGORY_EMOJI = {
  Argolla: '💍',
  Pasante: '✨',
  Cuff:    '⛓️',
  Collar:  '🔗',
  Dije:    '⭐',
  Pulsera: '💎',
  Anillo:  '💍',
}

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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
  return NAME_CORRECTIONS[key] || toTitleCase(raw.trim())
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

const CATEGORY_MAP = [
  { keys: ['argolla'],                              canonical: 'Argolla' },
  { keys: ['pasante'],                              canonical: 'Pasante' },
  { keys: ['cuff', 'cuffs'],                        canonical: 'Cuff'    },
  { keys: ['cadena', 'collar', 'conjunto', 'corbatero'], canonical: 'Collar' },
  { keys: ['choker', 'chokers'],                    canonical: 'Choker'  },
  { keys: ['dije'],                                 canonical: 'Dije'    },
  { keys: ['ajustable', 'pulsera', 'tennis'],       canonical: 'Pulsera' },
  { keys: ['anillo'],                               canonical: 'Anillo'  },
  { keys: ['broche'],                               canonical: 'Broche'  },
]

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
  if (s === 'plata')                        return 'Plata'
  if (s === 'plata dorada')                 return 'Plata Dorada'
  if (s === 'acero' || s === 'acero blanco') return 'Acero Blanco'
  if (s === 'bijou' || s === 'otros' || s === 'other') return 'bijou'
  return toTitleCase(raw.trim()) || 'Desconocido'
}

const CATEGORY_LABELS = {
  Argolla: 'Argollas',
  Pasante: 'Pasantes',
  Cuff:    'Cuffs',
  Collar:  'Collares',
  Dije:    'Dijes',
  Pulsera: 'Pulseras',
  Anillo:  'Anillos',
}

// ── Convierte un link de Dropbox al formato raw (directo) ─────
// Acepta tanto ?dl=0 como links ya en ?raw=1, y también
// links de carpeta compartida (www.dropbox.com/scl/...)
function toDropboxRaw(url = '') {
  if (!url) return ''
  return url
    .trim()
    .replace(/[?&]dl=0/, '?raw=1')          // ?dl=0  → ?raw=1
    .replace(/[?&]dl=1/, '?raw=1')          // ?dl=1  → ?raw=1
    .replace(/\?raw=1.*$/, '?raw=1')        // limpia params extra
    .replace(/^(https?:\/\/)www\./, '$1dl.') // www. → dl. (CDN directo)
}

// ── Parser CSV robusto ────────────────────────────────────────
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
// ⚠️  "Precio costo" se lee pero NUNCA se incluye en el objeto retornado
function rowToProduct(row) {
  const stock = parseFloat(row['Stock']) || 0
  if (stock <= 0) return null

  const rawCategory = row['Categoría'] || row['Categoria'] || ''
  const category    = normalizeCategory(rawCategory)

  const pricePar = parseFloat((row['Precio Par']        || '').replace(/[^0-9.]/g, ''))
  const priceInd = parseFloat((row['Precio individual'] || '').replace(/[^0-9.]/g, ''))
  const price    = (!isNaN(pricePar) && pricePar > 0) ? pricePar
                 : (!isNaN(priceInd) && priceInd > 0) ? priceInd
                 : null

  if (!price) return null

  const material  = normalizeMaterial(row['Material'])
  const priceNote = (!isNaN(pricePar) && pricePar > 0) ? 'par' : 'und'

  // ── Imagen desde Dropbox ──────────────────────────────────
  // Lee la columna "Imagen" y convierte el link al formato raw.
  // Si no hay imagen, image queda como '' y los componentes muestran el emoji.
  const image = toDropboxRaw(row['Imagen'] || row['imagen'] || row['Image'] || '')

  return {
    id:          (row['Id'] || '').trim() || Math.random().toString(36).slice(2),
    name:        correctName(row['Nombre'] || ''),
    category,
    subcategory: rawCategory.trim(),
    material,
    price,
    priceNote,
    image,                               // ← URL directa lista para usar en <img src>
    emoji:       CATEGORY_EMOJI[category] || '✦',
    // ⚠️  "Precio costo" NO está en este objeto
  }
}

// ── Hook principal ────────────────────────────────────────────
export function useProducts() {
  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([{ key: 'all', label: 'Todos' }])
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
      const cats = [{ key: 'all', label: 'Todos' }]

      items.forEach(p => {
        if (!seenCats.has(p.category)) {
          seenCats.add(p.category)
          cats.push({
            key: p.category,
            label: CATEGORY_LABELS[p.category] || p.category + (p.category.endsWith('s') ? '' : 's')
          })
        }
      })

      setProducts(items)
      setCategories(cats)
    } catch (err) {
      setError(err.message || 'Error al cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  return { products, categories, loading, error, refetch: fetchProducts }
}

export const formatPrice = (n) =>
  '$' + Number(n).toLocaleString('es-AR')
