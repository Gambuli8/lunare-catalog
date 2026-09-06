import { useState, useMemo, useEffect } from 'react'
import { useProducts, formatPrice } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import CloudinaryImage from './CloudinaryImage'
import ProductCard from './ProductCard'

// El servidor inyecta la pieza en el HTML (ver api/page.js) para que la
// ficha se pinte de una sin esperar al fetch del catálogo.
const injected = typeof window !== 'undefined' ? window.__PRODUCT__ : null

const MATERIAL_COPY = {
  'Plata': 'Plata de ley 925 — 92,5 % de plata pura y 7,5 % de otros metales, generalmente cobre.',
  'Plata Dorada': 'Plata de ley 925 con baño de oro.',
  'Acero Blanco': 'Acero quirúrgico con baño blanco. Resistente e hipoalergénico, ideal para uso diario.',
  'Bijou': 'Accesorio de bijouterie de alta calidad.',
}

const CARE = 'Guardala en un lugar fresco, seco y hermético, y por separado de otras piezas.\n' +
  'Evitá el contacto con agua, perfumes, cremas y cloro. No la uses al dormir ni al bañarte.\n' +
  'Limpiala con un paño suave y seco.'

const EXCHANGE = 'Por respeto a la higiene, los aros y cuffs a presión no tienen cambio. ' +
  'El resto del catálogo se puede cambiar dentro de los 10 días corridos, sin uso y en las mismas condiciones en que se recibió.'

function Accordion({ sections }) {
  const [open, setOpen] = useState(0)
  return (
    <div className='flex flex-col border-t border-[#e8e2da]'>
      {sections.map((s, i) => (
        <div key={s.title} className='border-b border-[#e8e2da]'>
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            className='flex items-center justify-between w-full gap-3 py-4 text-xs tracking-[0.12em] uppercase text-left hover:text-[#8f7647] transition-colors'
          >
            {s.title}
            <svg
              width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor'
              strokeWidth='1.7' strokeLinecap='round'
              className={`flex-shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}
            >
              <path d='M6 9l6 6 6-6' />
            </svg>
          </button>
          <div className={`grid transition-[grid-template-rows] duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className='overflow-hidden'>
              <p className='text-sm leading-relaxed text-[#5f574e] pb-5 whitespace-pre-line max-w-xl'>{s.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ProductPage({ slug }) {
  const { products, loading } = useProducts()
  const { addItem, items } = useCart()
  const [qty, setQty] = useState(1)

  const product = useMemo(() => {
    const fresh = products.find(p => p.slug === slug)
    if (fresh) return fresh
    // Mientras viaja el catálogo mostramos la copia que mandó el servidor.
    return injected && injected.slug === slug ? injected : null
  }, [products, slug])

  useEffect(() => { setQty(1) }, [slug])

  useEffect(() => {
    if (product) document.title = `${product.name} · ${product.subcategory || product.category} | Lunare Accesorios`
  }, [product])

  if (!product) {
    if (loading) {
      return (
        <div className='px-6 py-24 mx-auto max-w-7xl md:px-12'>
          <div className='grid gap-12 md:grid-cols-2 animate-pulse'>
            <div className='aspect-[4/5] bg-[#e8e2da]' />
            <div className='flex flex-col gap-4 pt-6'>
              <div className='h-3 w-28 bg-[#e8e2da]' />
              <div className='h-12 w-2/3 bg-[#e8e2da]' />
              <div className='h-4 w-40 bg-[#e8e2da]' />
              <div className='h-16 w-48 bg-[#e8e2da] mt-4' />
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className='flex flex-col items-center gap-4 px-6 py-32 text-center'>
        <h1 className='font-serif text-3xl font-light'>No encontramos esa pieza</h1>
        <p className='text-sm text-[#5f574e] max-w-sm'>
          Puede que se haya agotado. Mirá el resto del catálogo, que se actualiza todos los días.
        </p>
        <a
          href='/tienda'
          className='mt-2 border border-[#0e0d0c] px-8 py-3.5 text-xs tracking-[0.14em] uppercase hover:bg-[#0e0d0c] hover:text-white transition-colors'
        >
          Ver la tienda
        </a>
      </div>
    )
  }

  const effective = product.pricePromo ?? product.price
  const inCart = items.find(i => i.id === product.id)
  const maxQty = product.stock ?? 1
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4)

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addItem({ ...product, price: effective })
  }

  const waText = encodeURIComponent(
    `¡Hola! Me interesa ${product.name} (Cód. ${product.id}) — ${formatPrice(effective)}. ¿Me contás más?`
  )

  const sections = [
    { title: 'Descripción', body: `${product.subcategory || product.category} de ${product.material.toLowerCase()}. ${product.priceNote === 'par' ? 'Se vende por par.' : 'Se vende por unidad.'}` },
    { title: 'Material y medidas', body: MATERIAL_COPY[product.material] || product.material },
    { title: 'Cuidados', body: CARE },
    { title: 'Cambios', body: EXCHANGE },
  ]

  return (
    <div className='px-6 pb-24 mx-auto max-w-7xl md:px-12'>
      <nav
        aria-label='Ruta de navegación'
        className='flex items-center gap-2 pt-6 text-xs tracking-wide text-[#5f574e]'
      >
        <a href='/' className='hover:text-[#8f7647] transition-colors'>Inicio</a>
        <span className='text-[#8f877e]'>/</span>
        <a href='/tienda' className='hover:text-[#8f7647] transition-colors'>Tienda</a>
        <span className='text-[#8f877e]'>/</span>
        <span className='text-[#0e0d0c]'>{product.name}</span>
      </nav>

      <div className='grid gap-10 pt-8 md:grid-cols-2 md:gap-16'>
        <div className='relative bg-[#f0ece6] overflow-hidden'>
          <CloudinaryImage
            src={product.image}
            alt={`${product.name} — ${product.subcategory || product.category} de ${product.material}`}
            priority
            modal
            className='w-full aspect-[4/5] object-contain'
            fallback={
              <div className='w-full aspect-[4/5] flex items-center justify-center text-7xl opacity-40'>
                {product.emoji}
              </div>
            }
          />
          {product.pricePromo && (
            <span className='absolute top-4 left-4 bg-[#a8322a] text-white text-[10px] tracking-[0.16em] uppercase px-2.5 py-1.5'>
              Oferta
            </span>
          )}
        </div>

        <div className='flex flex-col gap-5'>
          <div className='flex flex-col gap-2'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='text-xs tracking-[0.16em] uppercase text-[#8f7647] font-medium'>{product.material}</span>
              <span className='w-[3px] h-[3px] rounded-full bg-[#b0a89e]' />
              <span className='text-xs text-[#5f574e] tracking-wide'>Cód. {product.id}</span>
            </div>
            <h1 className='font-serif text-[clamp(34px,5vw,50px)] font-light leading-none'>{product.name}</h1>
            <p className='text-[15px] text-[#5f574e]'>
              {product.subcategory || product.category}
              {product.priceNote === 'par' && ' · el par'}
            </p>
          </div>

          <div className='flex flex-col gap-1.5 py-5 border-y border-[#e8e2da]'>
            <div className='flex flex-wrap items-baseline gap-3'>
              <span className={`font-serif text-[40px] font-medium leading-none ${product.pricePromo ? 'text-[#a8322a]' : ''}`}>
                {formatPrice(effective)}
              </span>
              {product.pricePromo && (
                <span className='font-serif text-[22px] text-[#7a7269] line-through leading-none'>
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            <span className='text-[13px] text-[#5f574e]'>
              {product.priceNote === 'par' ? 'el par — el precio ya incluye las dos piezas' : 'precio por unidad'}
            </span>
          </div>

          <div className='flex items-center gap-2.5 text-sm'>
            <span className='w-2 h-2 rounded-full bg-[#0f7a41]' />
            {product.stock <= 5
              ? `Últimas ${product.stock} ${product.stock === 1 ? 'unidad disponible' : 'unidades disponibles'}`
              : 'Disponible para retirar'}
          </div>

          <div className='flex flex-wrap items-stretch gap-3'>
            <div className='flex items-center h-14 bg-white border border-[#e8e2da]'>
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label='Quitar una unidad'
                className='flex items-center justify-center w-12 h-full transition-colors hover:bg-[#f0ece6] disabled:text-[#c4bcb2] disabled:hover:bg-transparent'
              >
                <svg width='15' height='15' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' viewBox='0 0 24 24'><path d='M5 12h14' /></svg>
              </button>
              <span className='w-10 text-center'>{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label='Agregar una unidad'
                className='flex items-center justify-center w-12 h-full transition-colors hover:bg-[#f0ece6] disabled:text-[#c4bcb2] disabled:hover:bg-transparent'
              >
                <svg width='15' height='15' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' viewBox='0 0 24 24'><path d='M12 5v14M5 12h14' /></svg>
              </button>
            </div>
            <button
              onClick={handleAdd}
              className='flex-grow min-w-[200px] h-14 bg-[#0e0d0c] text-white text-xs tracking-[0.16em] uppercase hover:bg-[#8f7647] transition-colors duration-300'
            >
              {inCart ? 'Agregar otra vez' : 'Agregar al pedido'}
            </button>
          </div>

          <a
            href={`https://wa.me/542954476558?text=${waText}`}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center justify-center gap-2.5 h-13 py-3.5 bg-[#0f7a41] text-white text-xs tracking-[0.14em] uppercase hover:bg-[#0c6836] transition-colors'
          >
            <svg width='17' height='17' viewBox='0 0 24 24' fill='currentColor'>
              <path d='M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.03 1.02-1.03 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.34M12.05 21.8h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.22-3.74.99 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26C2.16 6.45 6.6 2.02 12.05 2.02c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.8 11.8 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z' />
            </svg>
            Consultar por esta pieza
          </a>

          <div className='flex flex-wrap gap-6 p-5 bg-white border border-[#e8e2da]'>
            <div className='flex items-start gap-3'>
              <svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='#8f7647' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z' /><circle cx='12' cy='10' r='3' />
              </svg>
              <div>
                <span className='block text-[13px] font-medium'>Retiro coordinado</span>
                <span className='text-[13px] text-[#5f574e]'>Santa Rosa (LP) y Nueva Córdoba</span>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='#8f7647' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                <rect x='2' y='5' width='20' height='14' rx='2' /><path d='M2 10h20' />
              </svg>
              <div>
                <span className='block text-[13px] font-medium'>Formas de pago</span>
                <span className='text-[13px] text-[#5f574e]'>Transferencia, Mercado Pago o efectivo</span>
              </div>
            </div>
          </div>

          <Accordion sections={sections} />
        </div>
      </div>

      {related.length > 0 && (
        <section className='pt-20'>
          <div className='flex items-baseline justify-between gap-4 mb-7'>
            <h2 className='font-serif text-[32px] font-light'>Completá el look</h2>
            <a href='/tienda' className='text-xs tracking-[0.12em] uppercase text-[#5f574e] hover:text-[#8f7647] transition-colors'>
              Ver toda la tienda
            </a>
          </div>
          <div className='grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7'>
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}
