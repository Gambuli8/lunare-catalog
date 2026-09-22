import { useState, useMemo, useEffect, useRef } from 'react'
import { useProducts, formatPrice } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import CloudinaryImage from './CloudinaryImage'
import ProductCard from './ProductCard'
import { trackProductView } from '../lib/track'
import Copiable from './Copiable'
import { esDije, esCadenaDeConjunto, precioBase } from '../lib/conjunto'

// El servidor inyecta la pieza en el HTML (ver api/page.js) para que la
// ficha se pinte de una sin esperar al fetch del catálogo.
const injected = typeof window !== 'undefined' ? window.__PRODUCT__ : null

const MATERIAL_COPY = {
  'Plata': 'Plata de ley 925 — 92,5 % de plata pura y 7,5 % de otros metales, generalmente cobre.',
  'Plata Dorada': 'Plata de ley 925 con baño de oro.',
  'Acero Blanco': 'Acero quirúrgico 316L con baño plateado. Hipoalergénico, resistente al agua, sudor y uso diario. No se mancha ni se pone negro fácilmente.',
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

// ── Armá tu conjunto ──────────────────────────────────────────
// La clienta se lleva un dije y la cadena le sale más barata. Se ofrece
// en las dos direcciones: desde el dije mostramos las cadenas, y desde la
// cadena, los dijes que le bajan el precio.
//
// Qué cadena entra lo decide la planilla, con la columna "Precio
// conjunto". Mientras no haya ninguna cargada, el bloque no aparece.
function Conjunto({ product, products, enCarrito, onArmar }) {
  const desdeDije = esDije(product)
  if (!desdeDije && !esCadenaDeConjunto(product)) return null

  const opciones = (desdeDije ? products.filter(esCadenaDeConjunto) : products.filter(esDije))
    .filter(p => p.id !== product.id)
    .slice(0, 8)

  if (!opciones.length) return null

  return (
    <section
      aria-labelledby='conjunto-titulo'
      className='flex flex-col gap-3 p-5 bg-white border border-[#c8b58a]'
    >
      <div className='flex flex-col gap-1'>
        <h2 id='conjunto-titulo' className='text-xs tracking-[0.16em] uppercase text-[#8f7647] font-medium'>
          Armá tu conjunto
        </h2>
        <p className='text-[13px] leading-relaxed text-[#5f574e]'>
          {desdeDije ? (
            'Sumale una cadena y te la llevás a precio de conjunto.'
          ) : (
            <>
              Con cualquier dije, esta cadena te sale{' '}
              <b className='font-medium text-[#0e0d0c]'>{formatPrice(product.priceCombo)}</b>
              {' '}en vez de {formatPrice(precioBase(product))}.
            </>
          )}
        </p>
      </div>

      <div className='flex gap-3 pb-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {opciones.map(o => (
          <button
            key={o.id}
            type='button'
            onClick={() => onArmar(o)}
            aria-label={`Armar el conjunto con ${o.name}`}
            className='flex-shrink-0 w-[104px] text-left group'
          >
            <CloudinaryImage
              src={o.image}
              alt=''
              className='w-[104px] h-[104px] object-cover bg-[#f0ece6] border border-[#e8e2da] group-hover:border-[#8f7647] transition-colors'
              fallback={<span className='block w-[104px] h-[104px] bg-[#f0ece6]' />}
            />
            <span className='block mt-1.5 text-[12px] leading-tight line-clamp-2'>{o.name}</span>
            {desdeDije ? (
              <span className='flex flex-wrap items-baseline gap-1.5 text-[12px]'>
                <b className='font-medium text-[#0f7a41]'>{formatPrice(o.priceCombo)}</b>
                <span className='line-through text-[#8f877e]'>{formatPrice(precioBase(o))}</span>
              </span>
            ) : (
              <span className='block text-[12px] text-[#5f574e]'>{formatPrice(precioBase(o))}</span>
            )}
          </button>
        ))}
      </div>

      <p className='text-[12px] text-[#5f574e]'>
        {enCarrito
          ? 'Elegí la pieza que quieras y la sumamos al carrito.'
          : 'Elegí la pieza que quieras y sumamos las dos al carrito.'}
      </p>
    </section>
  )
}

export default function ProductPage({ slug }) {
  const { products, loading } = useProducts()
  const { addItem, items } = useCart()
  const [qty, setQty] = useState(1)
  // Qué foto se está mirando. Vuelve a la primera al cambiar de pieza:
  // si no, entrás a otro producto y arrancás en la foto 3.
  const [foto, setFoto] = useState(0)

  // La barra de compra aparece cuando el botón de verdad no está a la vista.
  const botonComprar = useRef(null)
  const [barraVisible, setBarraVisible] = useState(false)

  const product = useMemo(() => {
    const fresh = products.find(p => p.slug === slug)
    if (fresh) return fresh
    // Mientras viaja el catálogo mostramos la copia que mandó el servidor.
    return injected && injected.slug === slug ? injected : null
  }, [products, slug])

  useEffect(() => { setQty(1); setFoto(0) }, [slug])

  useEffect(() => {
    const el = botonComprar.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const mirar = new IntersectionObserver(([entrada]) => setBarraVisible(!entrada.isIntersecting))
    mirar.observe(el)
    return () => mirar.disconnect()
  }, [slug])

  useEffect(() => {
    if (!product) return
    document.title = `${product.name} · ${product.subcategory || product.category} | Lunare Accesorios`
    trackProductView(product)
  }, [product?.id])

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

  // Una pieza puede tener varias fotos (columnas Imagen, Imagen 2...).
  const fotos = product.images?.length ? product.images : [product.image].filter(Boolean)
  const indiceFoto = Math.min(foto, Math.max(fotos.length - 1, 0))
  const fotoActiva = fotos[indiceFoto] || product.image
  const descripcionFoto = `${product.name} — ${product.subcategory || product.category} de ${product.material}`
    + (indiceFoto > 0 ? ` (foto ${indiceFoto + 1} de ${fotos.length})` : '')

  const effective = product.pricePromo ?? product.price
  const inCart = items.find(i => i.id === product.id)
  const maxQty = product.stock ?? 1
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4)

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addItem({ ...product, price: effective })
  }

  // Armar el conjunto es llevarse las dos piezas: si la que está mirando
  // todavía no está en el carrito, el precio de conjunto no se aplicaría
  // y el bloque habría prometido un descuento que no aparece.
  const armarConjunto = otra => {
    if (!inCart) addItem({ ...product, price: effective })
    addItem({ ...otra, price: otra.pricePromo ?? otra.price })
  }


  const sections = [
    { title: 'Descripción', body: `${product.subcategory || product.category} de ${product.material.toLowerCase()}.${product.priceNote === 'par' ? ' Se vende por par.' : ''}` },
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
        <a href='/' className='inline-flex items-center min-h-[44px] hover:text-[#8f7647] transition-colors'>Inicio</a>
        <span className='text-[#8f877e]'>/</span>
        <a href='/tienda' className='inline-flex items-center min-h-[44px] hover:text-[#8f7647] transition-colors'>Tienda</a>
        <span className='text-[#8f877e]'>/</span>
        <span className='text-[#0e0d0c]'>{product.name}</span>
      </nav>

      <div className='grid gap-10 pt-8 md:grid-cols-2 md:gap-16'>
        <div>
        <div className='relative bg-[#f0ece6] overflow-hidden'>
          {/* Sin key: al cambiar de foto se reemplaza el src y el navegador
              mantiene la anterior hasta que la nueva está lista. Con key,
              React desmontaba la imagen y quedaba un parpadeo en blanco. */}
          <CloudinaryImage
            src={fotoActiva}
            alt={descripcionFoto}
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

        {/* Las miniaturas solo existen si la pieza tiene más de una foto.
            Son botones: se llega con Tab y se activan con Enter. */}
        {fotos.length > 1 && (
          <div
            role='group'
            aria-label={`Fotos de ${product.name}`}
            className='flex gap-2 pt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          >
            {fotos.map((foto, i) => (
              <button
                key={foto}
                type='button'
                onClick={() => setFoto(i)}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
                aria-current={i === indiceFoto}
                className={`flex-shrink-0 w-[68px] h-[85px] overflow-hidden border-2 bg-[#f0ece6] transition-colors ${i === indiceFoto ? 'border-[#8f7647]' : 'border-transparent hover:border-[#cfc5b8]'}`}
              >
                <CloudinaryImage
                  src={foto}
                  alt=''
                  className='object-cover w-full h-full'
                  fallback={<span className='block w-full h-full bg-[#e8e2da]' />}
                />
              </button>
            ))}
          </div>
        )}
        </div>

        <div className='flex flex-col gap-5'>
          <div className='flex flex-col gap-2'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='text-xs tracking-[0.16em] uppercase text-[#8f7647] font-medium'>{product.material}</span>
              <span className='w-[3px] h-[3px] rounded-full bg-[#b0a89e]' />
              <Copiable valor={product.id} etiqueta='código de la pieza' className='text-xs text-[#5f574e] tracking-wide'>
                Cód. {product.id}
              </Copiable>
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
            {product.priceNote === 'par' && (
              <span className='text-[13px] text-[#5f574e]'>el par</span>
            )}
          </div>

          <div className='flex items-center gap-2.5 text-sm'>
            <span className='w-2 h-2 rounded-full bg-[#0f7a41]' />
            {product.stock > 5
              ? 'Disponible para retirar'
              : product.stock === 1
                ? 'Última unidad disponible'
                : `Últimas ${product.stock} unidades disponibles`}
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
              ref={botonComprar}
              onClick={handleAdd}
              className='flex-grow min-w-[200px] h-14 bg-[#0e0d0c] text-white text-xs tracking-[0.16em] uppercase hover:bg-[#8f7647] transition-colors duration-300'
            >
              {inCart ? 'Agregar otra vez' : 'Agregar al pedido'}
            </button>
          </div>

          <Conjunto
            product={product}
            products={products}
            enCarrito={Boolean(inCart)}
            onArmar={armarConjunto}
          />

          <div className='flex flex-wrap gap-6 p-5 bg-white border border-[#e8e2da]'>
            <div className='flex items-start gap-3'>
              <svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='#8f7647' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z' /><circle cx='12' cy='10' r='3' />
              </svg>
              <div>
                <span className='block text-[13px] font-medium'>Retiro coordinado</span>
                <span className='text-[13px] text-[#5f574e]'>Santa Rosa (LP) y Nueva Córdoba (Cba.)</span>
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
            <a href='/tienda' className='inline-flex items-center min-h-[44px] text-xs tracking-[0.12em] uppercase text-[#5f574e] hover:text-[#8f7647] transition-colors'>
              Ver toda la tienda
            </a>
          </div>
          <div className='grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7'>
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Barra de compra fija, solo en celular.
          El botón de agregar cae a unos 1000 px del tope y la pantalla del
          celular termina en 812: sin esto hay que scrollear para comprar, y
          casi todo el tráfico entra desde Instagram al celular. Aparece
          cuando el botón de arriba se va de la vista, así no compite con él. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-[#e8e2da] bg-white/95 backdrop-blur-sm transition-transform duration-300 ${barraVisible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-hidden={!barraVisible}
      >
        <div className='flex items-center gap-3 px-4 py-2.5'>
          <div className='min-w-0'>
            <p className='truncate text-[13px] text-[#5f574e]'>{product.name}</p>
            <p className='text-[17px] text-[#0e0d0c]'>
              {formatPrice(effective)}
              {product.priceNote === 'par' && <span className='text-[12px] text-[#8f877e]'> el par</span>}
            </p>
          </div>
          <button
            onClick={handleAdd}
            tabIndex={barraVisible ? 0 : -1}
            className='flex-shrink-0 px-6 ml-auto min-h-[48px] bg-[#0e0d0c] text-white text-xs tracking-[0.14em] uppercase transition-colors hover:bg-[#8f7647]'
          >
            {inCart ? 'Agregar otra' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}
