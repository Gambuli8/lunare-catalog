import { useProducts, formatPrice } from '../hooks/useProducts'
import CloudinaryImage from './CloudinaryImage'
import Icon from './Icon'

// La pieza de la portada sale del catálogo, no está fija en el código:
// la primera marcada como Destacada en la planilla, y si no hay ninguna,
// la primera en oferta. Cambiándola en el Sheet cambia la portada.
function piezaDePortada(products) {
  return products.find(p => p.featured && p.image)
    || products.find(p => p.pricePromo && p.image)
    || products.find(p => p.image)
    || null
}

export default function Hero() {
  const { products } = useProducts()
  const pieza = piezaDePortada(products)

  return (
    <section
      id='inicio'
      className='px-6 md:px-12 bg-cream'
    >
      <div className='grid items-center max-w-screen-xl gap-10 py-16 mx-auto md:grid-cols-2 md:gap-16 md:py-24'>

        <div className='flex flex-col items-start order-2 gap-6 md:order-1'>
          <p className='text-xs tracking-[0.16em] uppercase text-gold font-medium animate-fade-up'>
            Plata 925 · Plata dorada · Acero blanco
          </p>

          <h1 className='font-serif text-[clamp(46px,7vw,84px)] font-light leading-[0.98] text-dark'>
            <span className='block animate-fade-up'>Cada joya,</span>
            <span className='block animate-fade-up' style={{ animationDelay: '.1s' }}>una expresión</span>
            <span className='block italic animate-fade-up text-gold' style={{ animationDelay: '.2s' }}>de tu estilo.</span>
          </h1>

          <p
            className='max-w-md text-[17px] leading-relaxed text-muted animate-fade-up'
            style={{ animationDelay: '.3s' }}
          >
            Argollas, collares y pulseras de plata de ley, elegidas de a una.
            Coordinamos el retiro por WhatsApp, sin formularios ni esperas.
          </p>

          <div
            className='flex flex-wrap items-center gap-5 mt-2 animate-fade-up'
            style={{ animationDelay: '.42s' }}
          >
            <a
              href='/tienda'
              className='inline-flex items-center gap-3 px-8 py-4 text-xs tracking-[0.14em] uppercase text-cream bg-dark border border-dark hover:bg-transparent hover:text-dark transition-colors duration-300'
            >
              Ver la tienda
              <Icon name='flecha' size={15} strokeWidth={1.8} />
            </a>

            {products.length > 0 && (
              <span className='inline-flex items-center gap-2.5 text-[13px] text-muted'>
                <span className='relative flex w-2 h-2'>
                  <span className='absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-gold' />
                  <span className='relative inline-flex w-2 h-2 rounded-full bg-gold' />
                </span>
                {products.length} piezas con stock hoy
              </span>
            )}
          </div>
        </div>

        <div className='relative order-1 md:order-2 animate-fade-up' style={{ animationDelay: '.15s' }}>
          {pieza ? (
            <>
              <a href={`/producto/${pieza.slug}`} className='block overflow-hidden group bg-line'>
                <CloudinaryImage
                  src={pieza.image}
                  alt={`${pieza.name} — ${pieza.subcategory || pieza.category} de ${pieza.material}`}
                  priority
                  className='w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-[1.03]'
                  fallback={<div className='w-full aspect-[4/5] bg-line' />}
                />
              </a>

              <a
                href={`/producto/${pieza.slug}`}
                className='absolute flex flex-col gap-1 px-6 py-4 transition-transform duration-300 border shadow-lg -left-3 md:-left-10 bottom-8 bg-cream border-border max-w-[260px] hover:-translate-y-1'
              >
                <span className='text-[10px] tracking-[0.2em] uppercase text-gold'>
                  {pieza.featured ? 'Destacado' : pieza.pricePromo ? 'En oferta' : 'De la colección'}
                </span>
                <span className='font-serif text-2xl font-light leading-tight text-dark'>{pieza.name}</span>
                <span className='text-[13px] text-muted'>
                  {pieza.subcategory || pieza.category} · {formatPrice(pieza.pricePromo ?? pieza.price)}
                  {pieza.priceNote === 'par' && ' el par'}
                </span>
              </a>
            </>
          ) : (
            // Mientras viaja el catálogo, un bloque del mismo alto para que
            // no salte la página cuando entra la foto.
            <div className='w-full aspect-[4/5] bg-line animate-pulse' />
          )}
        </div>

      </div>
    </section>
  )
}
