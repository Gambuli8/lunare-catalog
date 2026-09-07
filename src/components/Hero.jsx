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

// Dos composiciones distintas, no la misma achicada:
//
// En mobile la foto es el fondo y el texto va encima, para que el titular
// y el botón entren en la primera pantalla. Antes la foto empujaba el CTA
// a y=959 con el fold en 812: quien llegaba de Instagram no veía el botón
// sin scrollear, y de ahí viene casi todo el tráfico.
//
// De md para arriba hay lugar de sobra, así que vuelve el split editorial
// con la foto al lado y la tarjeta flotante.
export default function Hero() {
  const { products } = useProducts()
  const pieza = piezaDePortada(products)

  return (
    <section
      id='inicio'
      className='relative bg-cream md:px-12'
    >
      <div className='md:max-w-screen-xl md:mx-auto md:grid md:grid-cols-2 md:items-center md:gap-16 md:py-24'>

        {/* Foto — fondo en mobile, columna en desktop */}
        <div className='absolute inset-0 md:static md:order-2'>
          <div className='relative w-full h-full'>
            {pieza ? (
              <>
                <CloudinaryImage
                  src={pieza.image}
                  alt={`${pieza.name} — ${pieza.subcategory || pieza.category} de ${pieza.material}`}
                  priority
                  className='object-cover w-full h-full md:aspect-[4/5] md:h-auto'
                  fallback={<div className='w-full h-full bg-line md:aspect-[4/5]' />}
                />
                {/* Velo para que el texto se lea sobre la foto. Solo mobile. */}
                <div className='absolute inset-0 bg-gradient-to-t from-dark/92 via-dark/62 via-45% to-dark/20 md:hidden' />

                <a
                  href={`/producto/${pieza.slug}`}
                  className='absolute z-10 hidden md:flex flex-col gap-1 px-6 py-4 transition-transform duration-300 border shadow-lg -left-10 bottom-8 bg-cream border-border max-w-[260px] hover:-translate-y-1'
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
              <div className='w-full h-full bg-line md:aspect-[4/5] animate-pulse' />
            )}
          </div>
        </div>

        {/* Texto */}
        <div className='relative z-10 flex flex-col justify-end gap-5 px-6 pt-32 pb-9 h-[calc(100svh-116px)] min-h-[520px] max-h-[760px] md:h-auto md:min-h-0 md:max-h-none md:p-0 md:gap-6 md:order-1 md:items-start'>

          <p className='text-[10.5px] md:text-xs tracking-[0.12em] md:tracking-[0.16em] uppercase font-medium text-cream/85 md:text-gold animate-fade-up'>
            Plata 925 · Plata dorada · Acero blanco
          </p>

          <h1 className='font-serif text-[clamp(40px,11vw,84px)] font-light leading-[1.02] md:leading-[0.98] text-cream md:text-dark'>
            <span className='block animate-fade-up'>Cada joya,</span>
            <span className='block animate-fade-up' style={{ animationDelay: '.1s' }}>una expresión</span>
            <span className='block italic animate-fade-up text-gold-lt md:text-gold' style={{ animationDelay: '.2s' }}>de tu estilo.</span>
          </h1>

          {/* En mobile el titular ya dice lo suyo y el espacio vale oro:
              el párrafo aparece recién en pantallas grandes. */}
          <p
            className='hidden md:block max-w-md text-[17px] leading-relaxed text-muted animate-fade-up'
            style={{ animationDelay: '.3s' }}
          >
            Argollas, collares y pulseras de plata de ley, elegidas de a una.
            Coordinamos el retiro por WhatsApp, sin formularios ni esperas.
          </p>

          <div
            className='flex flex-col w-full gap-4 mt-1 animate-fade-up md:flex-row md:items-center md:w-auto md:gap-5 md:mt-2'
            style={{ animationDelay: '.42s' }}
          >
            <a
              href='/tienda'
              className='inline-flex items-center justify-center w-full gap-3 px-8 py-4 text-xs tracking-[0.14em] uppercase transition-colors duration-300 bg-cream text-dark md:w-auto md:bg-dark md:text-cream md:border md:border-dark md:hover:bg-transparent md:hover:text-dark'
            >
              Ver la tienda
              <Icon name='flecha' size={15} strokeWidth={1.8} />
            </a>

            {products.length > 0 && (
              <span className='inline-flex items-center gap-2.5 text-[13px] text-cream/75 md:text-muted'>
                <span className='relative flex w-2 h-2'>
                  <span className='absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-gold-lt md:bg-gold' />
                  <span className='relative inline-flex w-2 h-2 rounded-full bg-gold-lt md:bg-gold' />
                </span>
                {products.length} piezas con stock hoy
              </span>
            )}
          </div>

          {/* La pieza de la foto, nombrada. En desktop esto vive en la
              tarjeta flotante de al lado. */}
          {pieza && (
            <a
              href={`/producto/${pieza.slug}`}
              className='inline-flex items-center gap-2 py-2 text-[12px] text-cream/70 md:hidden animate-fade-up'
              style={{ animationDelay: '.5s' }}
            >
              En la foto: {pieza.name} · {formatPrice(pieza.pricePromo ?? pieza.price)}
              <Icon name='flecha' size={12} strokeWidth={2} />
            </a>
          )}
        </div>

      </div>
    </section>
  )
}
