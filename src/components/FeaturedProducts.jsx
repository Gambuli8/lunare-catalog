import { useState } from 'react'
import { useProducts, formatPrice } from '../hooks/useProducts'
import { useModal } from '../context/ModalContext'
import { useCart } from '../context/CartContext'

function getMaterialBadgeStyle(material = '') {
  const m = material.toLowerCase().trim()
  if (m === 'plata dorada' || m.includes('dorada')) return { bg: '#b89a6a', text: '#fff' }
  if (m === 'plata')                                 return { bg: '#ddebff', text: '#1a3a4a' }
  if (m.includes('acero'))                           return { bg: '#bfe1f6', text: '#1a3a4a' }
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
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    )
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#ede7df] flex items-center justify-center">
      <span className="text-6xl select-none opacity-50 group-hover:scale-110 transition-transform duration-500">
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

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      onClick={() => openModal(product)}
      className="group relative bg-white border border-[#e8e2da] rounded-sm overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col"
      style={{ animation: 'fadeUp 0.5s ease both', animationDelay: `${index * 0.1}s` }}
    >
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden">
        <FeaturedImage image={product.image} emoji={product.emoji} name={product.name} />

        {/* Badges — en mobile se apilan verticalmente a la izquierda */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <span className="bg-[#b89a6a] text-white text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-sm font-sans self-start">
            ✦ Destacado
          </span>
          <span
            className="text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm font-sans font-medium self-start"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {product.material}
          </span>
        </div>

        {/* Hint hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 z-10">
          <span className="text-[10px] tracking-[0.2em] uppercase font-sans bg-white/90 text-[#0e0d0c] px-3 py-1.5 rounded-full shadow-sm">
            Ver detalle
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#b89a6a] font-sans mb-1">{product.category}</p>
        <h3 className="font-serif text-xl font-light text-[#0e0d0c] mb-1 leading-tight">{product.name}</h3>
        <p className="text-[11px] text-[#7a7269] tracking-wide mb-4">{product.subcategory}</p>
        <div className="flex items-end justify-between mt-auto">
          <div>
            <div className="font-serif text-xl font-medium text-[#0e0d0c]">{formatPrice(product.price)}</div>
            <div className="text-[10px] text-[#7a7269] tracking-widest">
              {product.priceNote === 'par' ? 'por par' : 'por unidad'}
            </div>
          </div>
          <button
            onClick={handleAdd}
            aria-label="Agregar al carrito"
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-300 flex-shrink-0
              ${added ? 'bg-green-500 scale-110' : 'bg-[#0e0d0c] hover:bg-[#b89a6a] hover:scale-110'}`}
          >
            {added
              ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            }
          </button>
        </div>
      </div>

      <div className="h-0.5 bg-[#b89a6a] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </div>
  )
}

export default function FeaturedProducts() {
  const { products, loading } = useProducts()
  const featured = products.slice(0, 4)

  if (loading || featured.length === 0) return null

  return (
    <section className="px-6 md:px-12 py-20 bg-[#F9F5F2]">
      <div className="text-center mb-10">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#b89a6a] font-sans mb-2">Lo más nuevo</p>
        <h2 className="font-serif text-[clamp(28px,4vw,42px)] font-light text-[#0e0d0c]">Productos Destacados</h2>
        <p className="text-sm text-[#7a7269] mt-2 font-sans">Clickeá una joya para ver todos los detalles</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        {featured.map((p, i) => (
          <FeaturedCard key={p.id} product={p} index={i} />
        ))}
      </div>

      <div className="text-center mt-10">
        <a
          href="#catalogo"
          className="inline-flex items-center gap-2 border border-[#0e0d0c] text-[#0e0d0c] text-xs tracking-[0.15em] uppercase font-sans px-8 py-3.5 hover:bg-[#0e0d0c] hover:text-white transition-colors duration-300"
        >
          Ver toda la tienda
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
