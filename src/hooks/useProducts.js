import { useEffect, useReducer } from 'react'

// El catálogo se pide a /api/products, que lee el Google Sheet del lado
// del servidor y devuelve los productos ya normalizados y sin la columna
// "Precio costo". La URL del Sheet nunca llega al navegador.
const ENDPOINT = '/api/products'

// Un solo store para toda la app: Catalog y FeaturedProducts montan el
// hook por separado y antes cada uno disparaba su propio fetch del CSV.
const TTL = 60_000

const CATEGORY_LABELS = {
  Argolla: 'Argollas', Pasante: 'Pasantes', Cuff: 'Cuffs',
  Collar: 'Collares', Dije: 'Dijes', Pulsera: 'Pulseras', Anillo: 'Anillos',
}

const ALL = { key: 'all', label: 'Todos' }

const store = {
  products: [],
  categories: [ALL],
  loading: true,
  error: null,
  fetchedAt: 0,
}

const listeners = new Set()
let inflight = null

const emit = () => listeners.forEach(notify => notify())

function buildCategories(products) {
  const seen = new Set()
  const cats = [ALL]
  products.forEach(p => {
    if (seen.has(p.category)) return
    seen.add(p.category)
    cats.push({
      key: p.category,
      label: CATEGORY_LABELS[p.category] || p.category + (p.category.endsWith('s') ? '' : 's'),
    })
  })
  return cats
}

function load(force = false) {
  if (inflight) return inflight
  if (!force && store.products.length && Date.now() - store.fetchedAt < TTL) {
    return Promise.resolve()
  }

  store.loading = true
  store.error = null
  emit()

  inflight = (async () => {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { products } = await res.json()
      store.products = Array.isArray(products) ? products : []
      store.categories = buildCategories(store.products)
      store.fetchedAt = Date.now()
    } catch (err) {
      store.error = err.message || 'Error al cargar el catálogo'
    } finally {
      store.loading = false
      inflight = null
      emit()
    }
  })()

  return inflight
}

export function useProducts() {
  const [, rerender] = useReducer(n => n + 1, 0)

  useEffect(() => {
    listeners.add(rerender)
    load()
    return () => listeners.delete(rerender)
  }, [rerender])

  return {
    products: store.products,
    categories: store.categories,
    loading: store.loading,
    error: store.error,
    refetch: () => load(true),
  }
}

export const formatPrice = n => '$' + Number(n).toLocaleString('es-AR')
