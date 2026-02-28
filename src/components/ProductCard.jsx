import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useModal } from '../context/ModalContext'
import { formatPrice } from '../hooks/useProducts'

function getMaterialBadgeStyle(material = '') {
  const m = material.toLowerCase().trim()
  if (m === 'plata dorada' || m.includes('dorada')) return { bg: '#b89a6a', text: '#fff' }
  if (m === 'plata')  return { bg: '#ddebff', text: '#1a3a4a' }
  if (m.includes('acero')) return { bg: '#bfe1f6', text: '#1a3a4a' }
  return { bg: '#010101', text: '#fff' }
}

function ProductImage({ image, emoji, name }) {
  const [failed, setFailed] = useState(false)
  if (image && !failed) {
    return (
      <img src={image} alt={name} onError={() => setFailed(true)}
        className='object-cover w-full h-full transition-transform duration-500 group-hover:scale-105' />
    )
  }
  return (
    <div className='w-full h-full bg-gradient-to-br from-white to-[#ede7df] flex items-center justify-center'>
      <span className='text-5xl transition-transform duration-500 opacity-50 select-none group-hover:scale-110'>{emoji}</span>
    </div>
  )
}

// ── Bloque de precio reutilizable ─────────────────────────────
// Exportado para usarse en FeaturedProducts y ProductModal también
export function PriceDisplay({ price, pricePromo, priceNote, size = 'md' }) {
  const mainSize = size === 'lg' ? 'text-[32px]' : 'text-[22px]'
  const noteSize = size === 'lg' ? 'text-[12px]' : 'text-[10px]'

  return (
    <div>
      {pricePromo ? (
        <>
          <span className='inline-block bg-red-500 text-white text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm font-sans mb-1'>Oferta</span>
          <div className='flex flex-wrap items-baseline gap-2 leading-none'>
            <span className={`font-serif ${mainSize} font-medium text-red-600 leading-none`}>{formatPrice(pricePromo)}</span>
            <span className='font-serif text-[14px] text-[#b8b0a8] line-through leading-none'>{formatPrice(price)}</span>
          </div>
        </>
      ) : (
        <div className={`font-serif ${mainSize} font-medium text-[#0e0d0c] leading-none`}>{formatPrice(price)}</div>
      )}
      <div className={`${noteSize} text-[#7a7269] tracking-widest mt-0.5`}>{priceNote === 'par' ? 'precio por par' : 'por unidad'}</div>
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
    // Al carrito entra el precio efectivo: promo si existe, normal si no
    addItem({ ...product, price: product.pricePromo ?? product.price })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      onClick={() => openModal(product)}
      className='group bg-[#F9F5F2] border border-[#e8e2da] rounded-sm overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 animate-fade-up'
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className='relative overflow-hidden aspect-square'>
        <ProductImage
          image={product.image}
          emoji={product.emoji}
          name={product.name}
        />
        <span
          className='absolute top-3 right-3 text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm font-sans font-medium z-10'
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {product.material}
        </span>
        <div className='absolute inset-0 z-10 flex items-end justify-center pb-3 transition-colors duration-300 opacity-0 bg-black/0 group-hover:bg-black/10 group-hover:opacity-100'>
          <span className='text-[10px] tracking-[0.2em] uppercase font-sans bg-white/90 text-[#0e0d0c] px-3 py-1.5 rounded-full shadow-sm'>Ver detalle</span>
        </div>
      </div>

      <div className='flex flex-col flex-1 p-5'>
        <p className='text-[10px] tracking-[0.2em] uppercase text-[#b89a6a] font-sans mb-1.5'>{product.category}</p>
        <h3 className='font-serif text-[20px] font-light leading-snug text-[#0e0d0c] mb-1'>{product.name}</h3>
        <p className='text-[11px] text-[#7a7269] tracking-wider mb-4'>{product.subcategory}</p>

        <div className='flex items-end justify-between gap-2 mt-auto'>
          <PriceDisplay
            price={product.price}
            pricePromo={product.pricePromo}
            priceNote={product.priceNote}
          />
          <button
            onClick={handleAdd}
            aria-label='Agregar al carrito'
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-300 flex-shrink-0
              ${added ? 'bg-green-500 scale-110' : 'bg-[#0e0d0c] hover:bg-[#b89a6a] hover:scale-110'}`}
          >
            {added ? (
              <svg
                width='14'
                height='14'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                viewBox='0 0 24 24'
              >
                <path d='M5 13l4 4L19 7' />
              </svg>
            ) : (
              <svg
                width='14'
                height='14'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                viewBox='0 0 24 24'
              >
                <path d='M12 5v14M5 12h14' />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className='h-0.5 bg-[#b89a6a] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left' />
    </div>
  )
}
