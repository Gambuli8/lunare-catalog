import { useProducts } from '../hooks/useProducts'
import ProductCard from './ProductCard'
import Icon from './Icon'

const CUANTOS = 4

// Antes esta sección tenía su propia card, con su propia paleta de badges
// y su propio fondo taupe. Eran tres vocabularios distintos para lo mismo:
// ahora usa la misma card que la tienda, sobre la banda blanca.
export default function FeaturedProducts() {
  const { products, loading } = useProducts()

  const destacados = [
    ...products.filter(p => p.featured),
    ...products.filter(p => !p.featured && p.pricePromo),
  ].slice(0, CUANTOS)

  if (loading || destacados.length === 0) return null

  return (
    <section
      id='featured'
      className='px-6 py-20 border-t border-b md:px-12 bg-paper border-border'
    >
      <div className='max-w-screen-xl mx-auto'>
        <div className='flex flex-wrap items-end justify-between gap-4 mb-9'>
          <div className='flex flex-col gap-2'>
            <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium'>Lo más nuevo</p>
            <h2 className='font-serif text-[clamp(30px,4vw,42px)] font-light text-dark'>Destacados</h2>
          </div>
          <a
            href='/tienda'
            className='inline-flex items-center gap-2 py-2 text-xs tracking-[0.12em] uppercase text-muted hover:text-gold transition-colors group'
          >
            Ver toda la tienda
            <Icon name='flecha' size={13} className='transition-transform duration-300 group-hover:translate-x-1' />
          </a>
        </div>

        <div className='grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-7'>
          {destacados.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
