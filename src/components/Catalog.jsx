import { useState, useMemo } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductCard from './ProductCard'

// Catalog.jsx

const KNOWN_MATERIALS = ['Plata', 'Plata Dorada', 'Acero Blanco'];

function matchesMaterial(product, key) {
  if (key === 'all') return true

  // Si el filtro es "bijou", mostramos productos que NO estén en la lista de materiales conocidos
  if (key === 'bijou') {
    return !KNOWN_MATERIALS.includes(product.material)
  }

  // Para los demás (Plata, Acero, etc.), comparación directa
  return product.material === key
}

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

// ── Barra de búsqueda ─────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full sm:w-72">
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7269] pointer-events-none"
        width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Buscar por nombre..."
        className="w-full pl-9 pr-9 py-2 bg-white border border-[#e8e2da] rounded-full text-sm font-sans text-[#0e0d0c] placeholder-[#b8b0a8] outline-none focus:border-[#b89a6a] transition-colors duration-200"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7269] hover:text-[#0e0d0c] transition-colors"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default function Catalog() {
  const { products, categories, loading, error, refetch } = useProducts()
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeMaterial, setActiveMaterial] = useState('all')
  const [search, setSearch] = useState('')

  // Materiales fijos — "Bijou" agrupa todo lo que no sea los 3 materiales conocidos
  const MATERIALS = [
    { key: 'all', label: 'Todos' },
    { key: 'Plata', label: 'Plata' },
    { key: 'Plata Dorada', label: 'Plata Dorada' },
    { key: 'Acero Blanco', label: 'Acero Blanco' },
    { key: 'bijou', label: 'Bijou' }
  ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => (activeCategory === 'all' || p.category === activeCategory) && matchesMaterial(p, activeMaterial) && (!q || p.name.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q)))
  }, [products, activeCategory, activeMaterial, search])

  const resetFilters = () => {
    setActiveCategory('all')
    setActiveMaterial('all')
    setSearch('')
  }

  return (
    <section
      id='catalogo'
      className='px-6 py-24 bg-white md:px-12'
    >
      {/* Header */}
      <div className='mb-12 text-center'>
        <p className='text-[11px] tracking-[0.25em] uppercase text-[#b89a6a] font-sans mb-2'>Nuestra colección</p>
        <h2 className='font-serif text-[clamp(36px,5vw,52px)] font-light text-[#0e0d0c]'>Productos</h2>
        {!loading && !error && (
          <div className='flex items-center justify-center gap-2 mt-3'>
            <span className='relative flex w-2 h-2'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b89a6a] opacity-75' />
              <span className='relative inline-flex rounded-full h-2 w-2 bg-[#b89a6a]' />
            </span>
            <span className='text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans'>{products.length} productos disponibles · actualizado en vivo</span>
          </div>
        )}
      </div>

      {/* Filters + Search */}
      {!loading && !error && products.length > 0 && (
        <div className='flex flex-col gap-4 mb-12'>
          {/* Fila 1: Search + Actualizar */}
          <div className='flex flex-wrap items-center gap-4'>
            <SearchBar
              value={search}
              onChange={setSearch}
            />
            <button
              onClick={refetch}
              title='Actualizar catálogo'
              className='ml-auto flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[#7a7269] font-sans hover:text-[#b89a6a] transition-colors duration-200'
            >
              <svg
                width='13'
                height='13'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                viewBox='0 0 24 24'
              >
                <path d='M23 4v6h-6' />
                <path d='M1 20v-6h6' />
                <path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' />
              </svg>
              Actualizar
            </button>
          </div>

          {/* Fila 2: Categoría */}
          <div className='flex flex-wrap items-center gap-3'>
            <span className='text-[11px] tracking-[0.15em] uppercase text-[#7a7269] font-sans whitespace-nowrap'>Categoría</span>
            <div className='flex flex-wrap gap-2'>
              {categories.map(c => (
                <button
                  key={c.key}
                  onClick={() => setActiveCategory(c.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-1.5 rounded-full border font-sans transition-all duration-200
                    ${activeCategory === c.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-transparent text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c] hover:text-[#0e0d0c]'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fila 3: Material */}
          <div className='flex flex-wrap items-center gap-3'>
            <span className='text-[11px] tracking-[0.15em] uppercase text-[#7a7269] font-sans whitespace-nowrap'>Material</span>
            <div className='flex flex-wrap gap-2'>
              {MATERIALS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setActiveMaterial(m.key)}
                  className={`text-[11px] tracking-[0.1em] uppercase px-4 py-1.5 rounded-full border font-sans transition-all duration-200
                    ${activeMaterial === m.key ? 'bg-[#0e0d0c] text-white border-[#0e0d0c]' : 'bg-transparent text-[#7a7269] border-[#e8e2da] hover:border-[#0e0d0c] hover:text-[#0e0d0c]'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contador de resultados cuando hay filtros activos */}
          {(activeCategory !== 'all' || activeMaterial !== 'all' || search) && (
            <div className='flex items-center gap-3'>
              <span className='text-[11px] text-[#7a7269] font-sans'>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={resetFilters}
                className='text-[11px] tracking-[0.1em] uppercase text-[#b89a6a] font-sans hover:underline'
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className='grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-7'>
        {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={refetch}
          />
        )}
        {!loading && !error && filtered.length === 0 && products.length > 0 && (
          <EmptyState
            onReset={resetFilters}
            hasSearch={!!search}
          />
        )}
        {!loading &&
          !error &&
          filtered.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
            />
          ))}
      </div>
    </section>
  )
}
