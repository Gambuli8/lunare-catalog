import { useState } from 'react'
import { useProducts, formatPrice } from '../hooks/useProducts'
import { useModal } from '../context/ModalContext'
import { useCart } from '../context/CartContext'

function getMaterialBadgeStyle(material = '') {
  const m = material.toLowerCase().trim()
  if (m === 'plata dorada' || m.includes('dorada')) return { bg: '#b89a6a', text: '#fff' }
  if (m === 'plata')  return { bg: '#ddebff', text: '#1a3a4a' }
  if (m.includes('acero')) return { bg: '#bfe1f6', text: '#1a3a4a' }
  return { bg: '#e8c547', text: '#3d2e00' }
}

function FeaturedImage({ image, emoji, name }) {
  const [failed, setFailed] = useState(false)
  if (image && !failed) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
    )
  }
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#2a2420] to-[#1a1210] flex items-center justify-center">
      <span className="text-7xl opacity-30 select-none transition-transform duration-700 group-hover:scale-110">
        {emoji}
      </span>
    </div>
  )
}

function FeaturedCard({ product, index }) {
  const { openModal } = useModal()
  const { addItem }   = useCart()
  const [added, setAdded] = useState(false)
  const badge = getMaterialBadgeStyle(product.material)
  const effectivePrice = product.pricePromo ?? product.price

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem({ ...product, price: effectivePrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      onClick={() => openModal(product)}
      className="group relative overflow-hidden cursor-pointer rounded-sm"
      style={{
        aspectRatio: '3/4',
        animation: 'fadeUp 0.6s ease both',
        animationDelay: `${index * 0.12}s`,
      }}
    >
      {/* Imagen de fondo */}
      <FeaturedImage image={product.image} emoji={product.emoji} name={product.name} />

      {/* Gradiente oscuro desde abajo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* Badge material — arriba derecha */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className="text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm font-sans font-medium backdrop-blur-sm"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {product.material}
        </span>
      </div>

      {/* Badge destacado — arriba izquierda */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-sm font-sans bg-[#b89a6a]/90 text-white backdrop-blur-sm">
          ✦ Destacado
        </span>
      </div>

      {/* Contenido inferior — siempre visible */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-5 flex flex-col gap-3">

        {/* Categoría + nombre */}
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#b89a6a] font-sans mb-1">
            {product.category}
          </p>
          <h3 className="font-serif text-xl md:text-2xl font-light text-white leading-tight">
            {product.name}
          </h3>
          <p className="text-[11px] text-white/60 tracking-wide mt-0.5">
            {product.subcategory}
          </p>
        </div>

        {/* Precio + botón */}
        <div className="flex items-end justify-between gap-2">
          {/* Precio */}
          <div>
            {product.pricePromo ? (
              <>
                <span className="inline-block bg-red-500 text-white text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm font-sans mb-1">
                  Oferta
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-xl font-medium text-red-400 leading-none">
                    {formatPrice(product.pricePromo)}
                  </span>
                  <span className="font-serif text-sm text-white/40 line-through leading-none">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </>
            ) : (
              <span className="font-serif text-xl font-medium text-white leading-none">
                {formatPrice(product.price)}
              </span>
            )}
            <p className="text-[10px] text-white/50 tracking-widest mt-0.5">
              {product.priceNote === 'par' ? 'por par' : 'por unidad'}
            </p>
          </div>

          {/* Botón carrito */}
          <button
            onClick={handleAdd}
            aria-label="Agregar al carrito"
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-300 flex-shrink-0 border border-white/30
              ${added
                ? 'bg-green-500 border-green-500 scale-110'
                : 'bg-white/10 hover:bg-[#b89a6a] hover:border-[#b89a6a] hover:scale-110 backdrop-blur-sm'}`}
          >
            {added
              ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            }
          </button>
        </div>

        {/* Hint "Ver detalle" — aparece al hover */}
        <div className="overflow-hidden max-h-0 group-hover:max-h-10 transition-all duration-300">
          <div className="flex items-center justify-center gap-1.5 text-[10px] tracking-[0.2em] uppercase font-sans text-white/70 pt-1 border-t border-white/20">
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Ver detalle
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeaturedProducts() {
  const { products, loading } = useProducts()
  const featured = products.filter(p => p.featured)
  if (loading || featured.length === 0) return null

  return (
    <section id="featured" className="px-6 md:px-12 py-20 bg-[#0e0d0c]">

      {/* Header — sobre fondo oscuro */}
      <div className="mb-10 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#b89a6a] font-sans mb-2">Lo más nuevo</p>
        <h2 className="font-serif text-[clamp(28px,4vw,42px)] font-light text-white">Productos Destacados</h2>
        <p className="text-sm text-white/40 mt-2 font-sans">Clickeá una joya para ver todos los detalles</p>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {featured.map((p, i) => (
          <FeaturedCard key={p.id} product={p} index={i} />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 text-center">
        <a
          href="#catalogo"
          className="inline-flex items-center gap-2 border border-white/30 text-white text-xs tracking-[0.15em] uppercase font-sans px-8 py-3.5 hover:bg-white hover:text-[#0e0d0c] transition-colors duration-300"
        >
          Ver toda la tienda
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
