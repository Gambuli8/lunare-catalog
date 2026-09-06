import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useProducts } from '../hooks/useProducts'
import { navigate, shopUrl } from '../hooks/useRoute'
import { trackSearch } from '../lib/track'
import ProductCard from './ProductCard'

const MATERIALS = [
  { key: 'all', label: 'Todos' },
  { key: 'Plata', label: 'Plata' },
  { key: 'Plata Dorada', label: 'Plata Dorada' },
  { key: 'Acero Blanco', label: 'Acero Blanco' },
  { key: 'bijou', label: 'Bijou' }
]

const KNOWN_MATERIALS = ['Plata', 'Plata Dorada', 'Acero Blanco']

function matchesMaterial(product, key) {
  if (key === 'all') return true
  if (key === 'bijou') return !KNOWN_MATERIALS.includes(product.material)
  return product.material === key
}

const PAGE_SIZE = 20

function SkeletonCard() {
  return (
    <div className='bg-[#F9F5F2] border border-[#e8e2da] rounded-sm overflow-hidden animate-pulse'>
      <div className='aspect-square bg-[#e8e2da]' />
      <div className='flex flex-col gap-3 p-5'>
        <div className='h-2.5 w-16 bg-[#e8e2da] rounded' />
        <div className='h-5 w-3/4 bg-[#e8e2da] rounded' />
        <div className='h-2 w-1/2 bg-[#e8e2da] rounded' />
        <div className='flex items-end justify-between mt-2'>
          <div className='h-6 w-20 bg-[#e8e2da] rounded' />
          <div className='w-9 h-9 bg-[#e8e2da] rounded-full' />
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className='flex flex-col items-center gap-4 py-20 text-center col-span-full'>
      <span className='text-4xl'>⚠️</span>
      <p className='font-serif text-2xl text-[#0e0d0c]'>No pudimos cargar el catálogo</p>
      <p className='text-sm text-[#7a7269] max-w-xs font-sans'>{message || 'Verificá tu conexión o la URL del CSV de Google Sheets.'}</p>
      <button
        onClick={onRetry}
        className='mt-2 bg-[#0e0d0c] text-white text-xs tracking-[0.15em] uppercase font-sans px-6 py-3 hover:bg-[#7d6b5e] transition-colors duration-300'
      >
        Reintentar
      </button>
    </div>
  )
}

function EmptyState({ onReset, hasSearch }) {
  return (
    <div className='flex flex-col items-center gap-3 py-20 text-center col-span-full'>
      <span className='text-4xl'>{hasSearch ? '🔍' : '🛍️'}</span>
      <p className='font-serif text-2xl text-[#0e0d0c]'>Sin resultados</p>
      <p className='text-sm text-[#7a7269] font-sans'>{hasSearch ? 'No encontramos productos con esa búsqueda.' : 'No hay productos con esos filtros.'}</p>
      <button
        onClick={onReset}
        className='mt-2 border border-[#0e0d0c] text-[#0e0d0c] text-xs tracking-[0.15em] uppercase font-sans px-6 py-3 hover:bg-[#0e0d0c] hover:text-white transition-colors duration-300'
      >
        Limpiar filtros
      </button>
    </div>
  )
}

// SearchBar — visible en todos los tamaños. Con 103 productos y la mayoría
// del tráfico entrando desde Instagram, ocultarla en mobile dejaba sin buscar
// a la mayor parte de las visitas.
function SearchBar({ value, onChange }) {
  return (
    <div className='relative flex-1 min-w-0 sm:flex-none sm:w-72'>
      <svg
        className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7269] pointer-events-none'
        width='15'
        height='15'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        viewBox='0 0 24 24'
      >
        <circle
          cx='11'
          cy='11'
          r='8'
        />
        <path d='M21 21l-4.35-4.35' />
      </svg>
      <input
        type='text'
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='Buscar por nombre...'
        className='w-full h-11 pl-10 pr-10 bg-paper border border-border rounded-full text-sm text-dark placeholder-[#a89f95] outline-none focus:border-gold transition-colors duration-200'
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7269] hover:text-[#0e0d0c] transition-colors'
        >
          <svg
            width='13'
            height='13'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            viewBox='0 0 24 24'
          >
            <path d='M18 6L6 18M6 6l12 12' />
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
    <div className='flex flex-col items-center gap-3 pt-8 col-span-full'>
      <p className='text-xs text-[#7a7269] font-sans tracking-wide'>
        Mostrando <span className='font-medium text-[#0e0d0c]'>{shown}</span> de <span className='font-medium text-[#0e0d0c]'>{total}</span> productos
      </p>
      <button
        onClick={onLoadMore}
        className='flex items-center gap-2 border border-[#0e0d0c] text-[#0e0d0c] text-xs tracking-[0.15em] uppercase font-sans px-8 py-3.5 hover:bg-[#0e0d0c] hover:text-white transition-colors duration-300'
      >
        Ver {Math.min(remaining, PAGE_SIZE)} productos más
        <svg
          width='14'
          height='14'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          viewBox='0 0 24 24'
        >
          <path d='M12 5v14M5 12h14' />
        </svg>
      </button>
    </div>
  )
}

function FilterSheet({ open, onClose, categories, activeCategory, activeMaterial, onCategory, onMaterial, onReset, hasFilters, filteredCount }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden'
      />
      <div
        className='fixed bottom-0 left-0 right-0 z-[61] md:hidden bg-[#F9F5F2] rounded-t-2xl shadow-2xl'
        style={{ animation: 'sheetUp 0.3s cubic-bezier(0.32,0.72,0,1) both' }}
      >
        <div className='flex justify-center pt-3 pb-2'>
          <div className='w-10 h-1 rounded-full bg-[#d0c8c0]' />
        </div>
        <div className='px-6 pb-8 flex flex-col gap-6 max-h-[75vh] overflow-y-auto'>
          <div className='flex items-center justify-between'>
            <h3 className='font-serif text-xl font-light text-[#0e0d0c]'>Filtros</h3>
            <button
              onClick={onClose}
              className='text-[#7a7269] hover:text-[#0e0d0c] transition-colors'
            >
              <svg
                width='18'
                height='18'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                viewBox='0 0 24 24'
              >
                <path d='M18 6L6 18M6 6l12 12' />
              </svg>
            </button>
          </div>
          <div>
            <p className='text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans mb-3'>Categoría</p>
            <div className='flex flex-wrap gap-2'>
              {categories.map(c => (
                <button
                  key={c.key}
                  onClick={() => onCategory(c.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-2 rounded-full border font-sans transition-all duration-200
                    ${activeCategory === c.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-white text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c]'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className='text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans mb-3'>Material</p>
            <div className='flex flex-wrap gap-2'>
              {MATERIALS.map(m => (
                <button
                  key={m.key}
                  onClick={() => onMaterial(m.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-2 rounded-full border font-sans transition-all duration-200
                    ${activeMaterial === m.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-white text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c]'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className='flex gap-3 pt-2'>
            {hasFilters && (
              <button
                onClick={() => {
                  onReset()
                  onClose()
                }}
                className='flex-1 border border-[#e8e2da] text-[#7a7269] text-xs tracking-[0.1em] uppercase font-sans py-3 rounded-sm hover:border-[#0e0d0c] hover:text-[#0e0d0c] transition-colors'
              >
                Limpiar
              </button>
            )}
            <button
              onClick={onClose}
              className='flex-1 bg-[#0e0d0c] text-white text-xs tracking-[0.1em] uppercase font-sans py-3 rounded-sm hover:bg-[#b89a6a] transition-colors'
            >
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

export default function Catalog({ route, standalone = false }) {
  const { products, categories, loading, error, refetch } = useProducts()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Los filtros viven en la dirección, no en memoria: así una vista
  // filtrada se puede compartir, volver con el botón atrás y —en el caso
  // de la categoría— la indexa Google como página propia.
  const catSlug = route?.categorySlug || null
  const query = route?.query || {}
  const activeMaterial = query.material || 'all'
  const activeSort = query.orden || 'destacados'
  const urlSearch = query.q || ''

  const activeCategory = useMemo(() => {
    if (!catSlug) return 'all'
    return categories.find(c => c.slug === catSlug)?.key ?? 'all'
  }, [catSlug, categories])

  const activeCatDef = categories.find(c => c.key === activeCategory) || categories[0]

  // El input se maneja local para que escribir no espere a la navegación,
  // y se vuelca a la URL con un respiro.
  const [search, setSearch] = useState(urlSearch)
  const debounce = useRef()
  useEffect(() => { setSearch(urlSearch) }, [urlSearch])

  const pushUrl = useCallback(next => {
    navigate(shopUrl({
      categorySlug: next.categorySlug !== undefined ? next.categorySlug : catSlug,
      material: next.material !== undefined ? next.material : (activeMaterial === 'all' ? '' : activeMaterial),
      orden: next.orden !== undefined ? next.orden : activeSort,
      q: next.q !== undefined ? next.q : urlSearch,
    }), { replace: next.replace })
    setVisibleCount(PAGE_SIZE)
  }, [catSlug, activeMaterial, activeSort, urlSearch])

  const handleSearch = useCallback(val => {
    setSearch(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      pushUrl({ q: val, replace: true })
      if (val.trim().length > 2) trackSearch(val.trim())
    }, 300)
  }, [pushUrl])

  useEffect(() => () => clearTimeout(debounce.current), [])

  const handleCategory = useCallback(key => {
    const def = categories.find(c => c.key === key)
    pushUrl({ categorySlug: key === 'all' ? null : def?.slug || null })
  }, [categories, pushUrl])

  const handleMaterial = useCallback(key => {
    pushUrl({ material: key === 'all' ? '' : key })
  }, [pushUrl])

  const handleSort = useCallback(value => pushUrl({ orden: value }), [pushUrl])

  const resetFilters = useCallback(() => navigate('/tienda'), [])

  const filtered = useMemo(() => {
    const q = urlSearch.trim().toLowerCase()
    const list = products.filter(p =>
      (activeCategory === 'all' || p.category === activeCategory) &&
      matchesMaterial(p, activeMaterial) &&
      (!q || p.name.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q))
    )
    if (activeSort === 'menor') return [...list].sort((a, b) => (a.pricePromo ?? a.price) - (b.pricePromo ?? b.price))
    if (activeSort === 'mayor') return [...list].sort((a, b) => (b.pricePromo ?? b.price) - (a.pricePromo ?? a.price))
    if (activeSort === 'nombre') return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    return list
  }, [products, activeCategory, activeMaterial, urlSearch, activeSort])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const loadMore = useCallback(() => setVisibleCount(c => c + PAGE_SIZE), [])
  const hasFilters = activeCategory !== 'all' || activeMaterial !== 'all' || !!urlSearch
  const activeFilterCount = (activeCategory !== 'all' ? 1 : 0) + (activeMaterial !== 'all' ? 1 : 0)

  useEffect(() => {
    if (!standalone) return
    const label = activeCategory === 'all' ? 'Tienda' : activeCatDef?.label
    document.title = `${label} | Lunare Accesorios`
  }, [standalone, activeCategory, activeCatDef])

  const heading = standalone
    ? (activeCategory === 'all' ? 'Tienda' : activeCatDef?.label || 'Tienda')
    : 'Productos'

  return (
    <section
      id='catalogo'
      className={`px-6 md:px-12 ${standalone ? 'pt-10 pb-24 bg-[#F9F5F2]' : 'py-24 bg-white'}`}
    >
      {standalone && (
        <nav aria-label='Ruta de navegación' className='flex items-center gap-2 mb-6 text-xs tracking-wide text-[#5f574e]'>
          <a href='/' className='hover:text-[#8f7647] transition-colors'>Inicio</a>
          <span className='text-[#8f877e]'>/</span>
          {activeCategory === 'all'
            ? <span className='text-[#0e0d0c]'>Tienda</span>
            : <>
                <a href='/tienda' className='hover:text-[#8f7647] transition-colors'>Tienda</a>
                <span className='text-[#8f877e]'>/</span>
                <span className='text-[#0e0d0c]'>{activeCatDef?.label}</span>
              </>}
        </nav>
      )}

      <div className={`mb-12 ${standalone ? '' : 'text-center'}`}>
        <p className='text-[11px] tracking-[0.25em] uppercase text-[#8f7647] font-sans mb-2'>Nuestra colección</p>
        {standalone
          ? <h1 className='font-serif text-[clamp(36px,5vw,52px)] font-light text-[#0e0d0c]'>{heading}</h1>
          : <h2 className='font-serif text-[clamp(36px,5vw,52px)] font-light text-[#0e0d0c]'>{heading}</h2>}
        {!loading && !error && (
          <div className={`flex items-center gap-2 mt-3 ${standalone ? '' : 'justify-center'}`}>
            <span className='relative flex w-2 h-2'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8f7647] opacity-75' />
              <span className='relative inline-flex rounded-full h-2 w-2 bg-[#8f7647]' />
            </span>
            <span className='text-[10px] tracking-[0.16em] uppercase text-muted'>
              {filtered.length} {filtered.length === 1 ? 'pieza' : 'piezas'}
              {/* La coletilla ocupaba una segunda línea en mobile y dejaba el
                  puntito colgado arriba; desde sm hay lugar de sobra. */}
              <span className='hidden sm:inline'> disponibles · el stock se actualiza solo</span>
            </span>
          </div>
        )}
      </div>

      {!loading && !error && products.length > 0 && (
        <div className='flex flex-col gap-4 mb-12'>
          <div className='flex items-center gap-3'>
            <SearchBar value={search} onChange={handleSearch} />

            {/* Botón filtros — solo mobile */}
            <button
              onClick={() => setSheetOpen(true)}
              className='md:hidden relative flex items-center gap-2 h-11 px-4 border rounded-full border-border text-muted text-[11px] tracking-[0.1em] uppercase hover:border-dark hover:text-dark transition-colors flex-shrink-0'
            >
              <svg width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                <path d='M4 6h16M7 12h10M10 18h4' />
              </svg>
              Filtros
              {activeFilterCount > 0 && <span className='absolute -top-1.5 -right-1.5 bg-[#8f7647] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-sans'>{activeFilterCount}</span>}
            </button>

            <div className='items-center hidden gap-2 ml-auto sm:flex'>
              <label htmlFor='orden' className='text-[10px] tracking-[0.15em] uppercase text-[#5f574e] font-sans'>Ordenar</label>
              <select
                id='orden'
                value={activeSort}
                onChange={e => handleSort(e.target.value)}
                className='bg-white border border-[#e8e2da] text-[12px] font-sans text-[#0e0d0c] px-3 py-2 outline-none focus:border-[#8f7647] transition-colors'
              >
                <option value='destacados'>Destacados</option>
                <option value='menor'>Menor precio</option>
                <option value='mayor'>Mayor precio</option>
                <option value='nombre'>Nombre A–Z</option>
              </select>
            </div>
          </div>

          {/* Filtros desktop — las categorías son links reales a /tienda/<categoria> */}
          <div className='flex-wrap items-center hidden gap-3 md:flex'>
            <span className='text-[11px] tracking-[0.15em] uppercase text-[#5f574e] font-sans whitespace-nowrap'>Categoría</span>
            <div className='flex flex-wrap gap-2'>
              {categories.map(c => (
                <a
                  key={c.key}
                  href={c.key === 'all' ? '/tienda' : `/tienda/${c.slug}`}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-1.5 rounded-full border font-sans transition-all duration-200
                    ${activeCategory === c.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-transparent text-[#5f574e] border-[#e8e2da] hover:border-[#0e0d0c] hover:text-[#0e0d0c]'}`}
                >
                  {c.label}
                </a>
              ))}
            </div>
          </div>

          <div className='flex-wrap items-center hidden gap-3 md:flex'>
            <span className='text-[11px] tracking-[0.15em] uppercase text-[#5f574e] font-sans whitespace-nowrap'>Material</span>
            <div className='flex flex-wrap gap-2'>
              {MATERIALS.map(m => (
                <button
                  key={m.key}
                  onClick={() => handleMaterial(m.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-1.5 rounded-full border font-sans transition-all duration-200
                    ${activeMaterial === m.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-transparent text-[#5f574e] border-[#e8e2da] hover:border-[#0e0d0c] hover:text-[#0e0d0c]'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className='flex items-center gap-3'>
              <span className='text-[11px] text-[#5f574e] font-sans'>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={resetFilters}
                className='text-[11px] tracking-[0.1em] uppercase text-[#8f7647] font-sans hover:underline'
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      )}

      <div className='grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-7'>
        {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && filtered.length === 0 && products.length > 0 && (
          <EmptyState onReset={resetFilters} hasSearch={!!urlSearch} />
        )}
        {!loading && !error && visible.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        {!loading && !error && filtered.length > 0 && (
          <LoadMoreButton shown={visible.length} total={filtered.length} onLoadMore={loadMore} />
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
        activeCategory={activeCategory}
        activeMaterial={activeMaterial}
        onCategory={handleCategory}
        onMaterial={handleMaterial}
        onReset={resetFilters}
        hasFilters={hasFilters}
        filteredCount={filtered.length}
      />
    </section>
  )
}
