import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../hooks/useProducts'
import CloudinaryImage from './CloudinaryImage'

function getMaterialBadgeStyle(material = '') {
  const m = material.toLowerCase().trim()
  if (m === 'plata dorada' || m.includes('dorada')) return { bg: '#b89a6a', text: '#fff' }
  if (m === 'plata')  return { bg: '#ddebff', text: '#1a3a4a' }
  if (m.includes('acero')) return { bg: '#bfe1f6', text: '#1a3a4a' }
  return { bg: '#0e0d0c', text: '#fff' }
}

// ── Bloque de precio reutilizable ─────────────────────────────
export function PriceDisplay({ price, pricePromo, priceNote, size = 'md' }) {
  const mainSize = size === 'lg' ? 'text-[32px]' : 'text-[22px]'
  const noteSize = size === 'lg' ? 'text-[12px]' : 'text-[11px]'

  return (
    <div>
      {pricePromo ? (
        <>
          <span className='inline-block bg-[#a8322a] text-white text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm font-sans mb-1'>
            Oferta
          </span>
          <div className='flex flex-wrap items-baseline gap-2 leading-none'>
            <span className={`font-serif ${mainSize} font-medium text-[#a8322a] leading-none`}>
              {formatPrice(pricePromo)}
            </span>
            <span className='font-serif text-[14px] text-[#7a7269] line-through leading-none'>
              {formatPrice(price)}
            </span>
          </div>
        </>
      ) : (
        <div className={`font-serif ${mainSize} font-medium text-[#0e0d0c] leading-none`}>
          {formatPrice(price)}
        </div>
      )}
      <div className={`${noteSize} text-[#5f574e] tracking-wide mt-1`}>
        {priceNote === 'par' ? 'el par' : 'por unidad'}
      </div>
    </div>
  )
}

export default function ProductCard({ product, index }) {
  const { addItem, items } = useCart()
  const [added, setAdded]  = useState(false)
  const badge    = getMaterialBadgeStyle(product.material)
  const priority = index < 2  // primeras 2 cards = above the fold en mobile

  // Qty actual en el carrito para este producto
  const cartQty  = items.find(i => i.id === product.id)?.qty ?? 0
  const maxQty   = product.stock ?? Infinity
  const atMax    = cartQty >= maxQty

  const handleAdd = () => {
    if (atMax) return
    addItem({ ...product, price: product.pricePromo ?? product.price })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const fallback = (
    <div className='w-full h-full bg-gradient-to-br from-white to-[#ede7df] flex items-center justify-center'>
      <span className='text-5xl opacity-50 select-none transition-transform duration-500 group-hover:scale-110'>
        {product.emoji}
      </span>
    </div>
  )

  return (
    <article
      className='group bg-white border border-[#e8e2da] rounded-sm overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl hover:border-[#cfc5b8] transition-all duration-300 animate-fade-up'
      style={{ animationDelay: `${(index % 8) * 0.04}s` }}
    >
      {/* El link envuelve foto y texto: el robot de Google lo sigue y se
          puede abrir en otra pestaña. El botón queda afuera para no
          anidar un <button> dentro de un <a>. */}
      <a href={`/producto/${product.slug}`} className='flex flex-col flex-1'>
        <div className='relative overflow-hidden aspect-square'>
          <CloudinaryImage
            src={product.image}
            alt={`${product.name} — ${product.subcategory || product.category} de ${product.material}`}
            priority={priority}
            className='object-cover w-full h-full transition-transform duration-500 group-hover:scale-105'
            fallback={fallback}
          />
          <span
            className='absolute top-3 right-3 text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm font-sans font-medium z-10'
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {product.material}
          </span>
          <div className='absolute inset-0 z-10 flex items-end justify-center pb-3 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-black/25 to-transparent'>
            <span className='text-[10px] tracking-[0.2em] uppercase font-sans bg-white/95 text-[#0e0d0c] px-3 py-1.5 rounded-full shadow-sm'>
              Ver detalle
            </span>
          </div>
        </div>

        <div className='flex flex-col flex-1 px-5 pt-5'>
          <p className='text-[10px] tracking-[0.2em] uppercase text-[#8f7647] font-sans mb-1.5'>{product.category}</p>
          <h3 className='font-serif text-[20px] font-light leading-snug text-[#0e0d0c] mb-1'>{product.name}</h3>
          <p className='text-[12px] text-[#5f574e] tracking-wide'>{product.subcategory}</p>
        </div>
      </a>

      <div className='flex items-end justify-between gap-2 px-5 pt-4 pb-5'>
        <PriceDisplay
          price={product.price}
          pricePromo={product.pricePromo}
          priceNote={product.priceNote}
        />
        <button
          onClick={handleAdd}
          aria-label={`Agregar ${product.name} al pedido`}
          disabled={atMax && !added}
          title={atMax ? 'Stock máximo en el pedido' : undefined}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-300 flex-shrink-0
            ${added ? 'bg-[#0f7a41] scale-110' : atMax ? 'bg-[#c8c0b8] cursor-not-allowed' : 'bg-[#0e0d0c] hover:bg-[#8f7647] hover:scale-110'}`}
        >
          {added
            ? <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'><path d='M5 13l4 4L19 7'/></svg>
            : <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'><path d='M12 5v14M5 12h14'/></svg>
          }
        </button>
      </div>

      <div className='h-0.5 bg-[#8f7647] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left' />
    </article>
  )
}
