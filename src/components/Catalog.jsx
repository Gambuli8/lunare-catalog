import { useState, useMemo, useCallback, useEffect } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductCard from './ProductCard'

const MATERIALS = [
  { key: 'all',          label: 'Todos'        },
  { key: 'Plata',        label: 'Plata'        },
  { key: 'Plata Dorada', label: 'Plata Dorada' },
  { key: 'Acero Blanco', label: 'Acero Blanco' },
  { key: 'bijou',        label: 'Bijou'        },
]

const KNOWN_MATERIALS = ['Plata', 'Plata Dorada', 'Acero Blanco']

function matchesMaterial(product, key) {
  if (key === 'all')   return true
  if (key === 'bijou') return !KNOWN_MATERIALS.includes(product.material)
  return product.material === key
}

const PAGE_SIZE = 20

function SkeletonCard() {
  return (
    <div className="bg-[#F9F5F2] border border-[#e8e2da] rounded-sm overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#e8e2da]" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-2.5 w-16 bg-[#e8e2da] rounded" />
        <div className="h-5 w-3/4 bg-[#e8e2da] rounded" />
        <div className="h-2 w-1/2 bg-[#e8e2da] rounded" />
        <div className="flex items-end justify-between mt-2">
          <div className="h-6 w-20 bg-[#e8e2da] rounded" />
          <div className="w-9 h-9 bg-[#e8e2da] rounded-full" />
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center col-span-full">
      <span className="text-4xl">⚠️</span>
      <p className="font-serif text-2xl text-[#0e0d0c]">No pudimos cargar el catálogo</p>
      <p className="text-sm text-[#7a7269] max-w-xs font-sans">
        {message || 'Verificá tu conexión o la URL del CSV de Google Sheets.'}
      </p>
      <button onClick={onRetry}
        className="mt-2 bg-[#0e0d0c] text-white text-xs tracking-[0.15em] uppercase font-sans px-6 py-3 hover:bg-[#7d6b5e] transition-colors duration-300">
        Reintentar
      </button>
    </div>
  )
}

function EmptyState({ onReset, hasSearch }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center col-span-full">
      <span className="text-4xl">{hasSearch ? '🔍' : '🛍️'}</span>
      <p className="font-serif text-2xl text-[#0e0d0c]">Sin resultados</p>
      <p className="text-sm text-[#7a7269] font-sans">
        {hasSearch ? 'No encontramos productos con esa búsqueda.' : 'No hay productos con esos filtros.'}
      </p>
      <button onClick={onReset}
        className="mt-2 border border-[#0e0d0c] text-[#0e0d0c] text-xs tracking-[0.15em] uppercase font-sans px-6 py-3 hover:bg-[#0e0d0c] hover:text-white transition-colors duration-300">
        Limpiar filtros
      </button>
    </div>
  )
}

function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full sm:w-72">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7269] pointer-events-none"
        width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="Buscar por nombre..."
        className="w-full pl-9 pr-9 py-2 bg-white border border-[#e8e2da] rounded-full text-sm font-sans text-[#0e0d0c] placeholder-[#b8b0a8] outline-none focus:border-[#b89a6a] transition-colors duration-200"
      />
      {value && (
        <button onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7269] hover:text-[#0e0d0c] transition-colors">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
}

function LoadMoreButton({ shown, total, onLoadMore }) {
  if (shown >= total) return null
  const remaining = total - shown
  return (
    <div className="col-span-full flex flex-col items-center gap-3 pt-8">
      <p className="text-xs text-[#7a7269] font-sans tracking-wide">
        Mostrando <span className="font-medium text-[#0e0d0c]">{shown}</span> de{' '}
        <span className="font-medium text-[#0e0d0c]">{total}</span> productos
      </p>
      <button onClick={onLoadMore}
        className="flex items-center gap-2 border border-[#0e0d0c] text-[#0e0d0c] text-xs tracking-[0.15em] uppercase font-sans px-8 py-3.5 hover:bg-[#0e0d0c] hover:text-white transition-colors duration-300">
        Ver {Math.min(remaining, PAGE_SIZE)} productos más
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  )
}

// ── Bottom Sheet de filtros (mobile) ──────────────────────────
function FilterSheet({ open, onClose, categories, activeCategory, activeMaterial, onCategory, onMaterial, onReset, hasFilters, filteredCount }) {

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const activeCount = (activeCategory !== 'all' ? 1 : 0) + (activeMaterial !== 'all' ? 1 : 0)

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden" />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] md:hidden bg-[#F9F5F2] rounded-t-2xl shadow-2xl"
        style={{ animation: 'sheetUp 0.3s cubic-bezier(0.32,0.72,0,1) both' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#d0c8c0]" />
        </div>

        <div className="px-6 pb-8 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-light text-[#0e0d0c]">Filtros</h3>
            <button onClick={onClose} className="text-[#7a7269] hover:text-[#0e0d0c] transition-colors">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Categoría */}
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans mb-3">Categoría</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.key} onClick={() => onCategory(c.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-2 rounded-full border font-sans transition-all duration-200
                    ${activeCategory === c.key
                      ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]'
                      : 'bg-white text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c]'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Material */}
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans mb-3">Material</p>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map(m => (
                <button key={m.key} onClick={() => onMaterial(m.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-2 rounded-full border font-sans transition-all duration-200
                    ${activeMaterial === m.key
                      ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]'
                      : 'bg-white text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c]'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            {hasFilters && (
              <button onClick={() => { onReset(); onClose() }}
                className="flex-1 border border-[#e8e2da] text-[#7a7269] text-xs tracking-[0.1em] uppercase font-sans py-3 rounded-sm hover:border-[#0e0d0c] hover:text-[#0e0d0c] transition-colors">
                Limpiar
              </button>
            )}
            <button onClick={onClose}
              className="flex-1 bg-[#0e0d0c] text-white text-xs tracking-[0.1em] uppercase font-sans py-3 rounded-sm hover:bg-[#b89a6a] transition-colors">
              Ver {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

export default function Catalog() {
  const { products, categories, loading, error, refetch } = useProducts()
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeMaterial, setActiveMaterial] = useState('all')
  const [search,         setSearch]         = useState('')
  const [visibleCount,   setVisibleCount]   = useState(PAGE_SIZE)
  const [sheetOpen,      setSheetOpen]      = useState(false)

  const handleCategory = useCallback((key) => { setActiveCategory(key); setVisibleCount(PAGE_SIZE) }, [])
  const handleMaterial = useCallback((key) => { setActiveMaterial(key); setVisibleCount(PAGE_SIZE) }, [])
  const handleSearch   = useCallback((val) => { setSearch(val);         setVisibleCount(PAGE_SIZE) }, [])
  const resetFilters   = useCallback(() => {
    setActiveCategory('all'); setActiveMaterial('all'); setSearch(''); setVisibleCount(PAGE_SIZE)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p =>
      (activeCategory === 'all' || p.category === activeCategory) &&
      matchesMaterial(p, activeMaterial) &&
      (!q || p.name.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q))
    )
  }, [products, activeCategory, activeMaterial, search])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const loadMore = useCallback(() => setVisibleCount(c => c + PAGE_SIZE), [])
  const hasFilters = activeCategory !== 'all' || activeMaterial !== 'all' || search

  // Cantidad de filtros activos para el badge del botón
  const activeFilterCount = (activeCategory !== 'all' ? 1 : 0) + (activeMaterial !== 'all' ? 1 : 0)

  return (
    <section id="catalogo" className="px-6 py-24 bg-white md:px-12">

      {/* Header */}
      <div className="mb-12 text-center">
        <p className="text-[11px] tracking-[0.25em] uppercase text-[#b89a6a] font-sans mb-2">Nuestra colección</p>
        <h2 className="font-serif text-[clamp(36px,5vw,52px)] font-light text-[#0e0d0c]">Productos</h2>
        {!loading && !error && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b89a6a] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#b89a6a]" />
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans">
              {products.length} productos disponibles · actualizado en vivo
            </span>
          </div>
        )}
      </div>

      {!loading && !error && products.length > 0 && (
        <div className="flex flex-col gap-4 mb-12">

          {/* Fila 1: Search + botón filtros (mobile) + Actualizar */}
          <div className="flex items-center gap-3">
            <SearchBar value={search} onChange={handleSearch} />

            {/* Botón filtros — solo mobile */}
            <button onClick={() => setSheetOpen(true)}
              className="md:hidden relative flex items-center gap-1.5 border border-[#e8e2da] text-[#7a7269] text-[11px] tracking-[0.1em] uppercase font-sans px-3 py-2 rounded-full hover:border-[#0e0d0c] hover:text-[#0e0d0c] transition-colors flex-shrink-0">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 6h16M7 12h10M10 18h4"/>
              </svg>
              Filtros
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#b89a6a] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-sans">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button onClick={refetch} title="Actualizar catálogo"
              className="ml-auto flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[#7a7269] font-sans hover:text-[#b89a6a] transition-colors duration-200 flex-shrink-0">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Actualizar
            </button>
          </div>

          {/* Filtros desktop — ocultos en mobile */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            <span className="text-[11px] tracking-[0.15em] uppercase text-[#7a7269] font-sans whitespace-nowrap">Categoría</span>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.key} onClick={() => handleCategory(c.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-1.5 rounded-full border font-sans transition-all duration-200
                    ${activeCategory === c.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-transparent text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c] hover:text-[#0e0d0c]'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex flex-wrap items-center gap-3">
            <span className="text-[11px] tracking-[0.15em] uppercase text-[#7a7269] font-sans whitespace-nowrap">Material</span>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map(m => (
                <button key={m.key} onClick={() => handleMaterial(m.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-1.5 rounded-full border font-sans transition-all duration-200
                    ${activeMaterial === m.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-transparent text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c] hover:text-[#0e0d0c]'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#7a7269] font-sans">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
              <button onClick={resetFilters}
                className="text-[11px] tracking-[0.1em] uppercase text-[#b89a6a] font-sans hover:underline">
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-7">
        {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && filtered.length === 0 && products.length > 0 && (
          <EmptyState onReset={resetFilters} hasSearch={!!search} />
        )}
        {!loading && !error && visible.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
        {!loading && !error && filtered.length > 0 && (
          <LoadMoreButton shown={visible.length} total={filtered.length} onLoadMore={loadMore} />
        )}
      </div>

      {/* Bottom Sheet filtros — mobile */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
        activeCategory={activeCategory}
        activeMaterial={activeMaterial}
        onCategory={(k) => { handleCategory(k) }}
        onMaterial={(k) => { handleMaterial(k) }}
        onReset={resetFilters}
        hasFilters={hasFilters}
        filteredCount={filtered.length}
      />
    </section>
  )
}
