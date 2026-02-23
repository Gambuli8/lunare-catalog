import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useModal } from '../context/ModalContext'
import { formatPrice } from '../hooks/useProducts'

function getMaterialBadgeStyle(material = '') {
  const m = material.toLowerCase().trim()
  if (m === 'plata dorada' || m.includes('dorada')) return { bg: '#b89a6a', text: '#fff' }
  if (m === 'plata')                                 return { bg: '#ddebff', text: '#1a3a4a' }
  if (m.includes('acero'))                           return { bg: '#bfe1f6', text: '#1a3a4a' }
  return { bg: '#e8c547', text: '#3d2e00' }          // biyú
}

// ── Imagen con fallback al emoji ──────────────────────────────
function ProductImage({ image, emoji, name }) {
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

  // Fallback: fondo degradado + emoji
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#ede7df] flex items-center justify-center">
      <span className="text-5xl select-none opacity-50 group-hover:scale-110 transition-transform duration-500">
        {emoji}
      </span>
    </div>
  )
}

export default function ProductCard({ product, index }) {
  const { addItem }   = useCart()
  const { openModal } = useModal()
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
      className="group bg-[#F9F5F2] border border-[#e8e2da] rounded-sm overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden">
        <ProductImage image={product.image} emoji={product.emoji} name={product.name} />

        {/* Badge material */}
        <span
          className="absolute top-3 right-3 text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm font-sans font-medium z-10"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {product.material}
        </span>

        {/* Hint "Ver detalle" al hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 z-10">
          <span className="text-[10px] tracking-[0.2em] uppercase font-sans bg-white/90 text-[#0e0d0c] px-3 py-1.5 rounded-full shadow-sm">
            Ver detalle
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#b89a6a] font-sans mb-1.5">
          {product.category}
        </p>
        <h3 className="font-serif text-[20px] font-light leading-snug text-[#0e0d0c] mb-1">
          {product.name}
        </h3>
        <p className="text-[11px] text-[#7a7269] tracking-wider mb-4">
          {product.subcategory}
        </p>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <div className="font-serif text-[22px] font-medium text-[#0e0d0c] leading-none">
              {formatPrice(product.price)}
            </div>
            <div className="text-[10px] text-[#7a7269] tracking-widest mt-0.5">
              {product.priceNote === 'par' ? 'precio por par' : 'por unidad'}
            </div>
          </div>

          <button
            onClick={handleAdd}
            aria-label="Agregar al carrito"
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-300 flex-shrink-0
              ${added
                ? 'bg-green-500 scale-110'
                : 'bg-[#0e0d0c] hover:bg-[#b89a6a] hover:scale-110'}`}
          >
            {added
              ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Línea dorada inferior al hover */}
      <div className="h-0.5 bg-[#b89a6a] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </div>
  )
}
