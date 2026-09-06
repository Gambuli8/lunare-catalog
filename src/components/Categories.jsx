import { useMemo } from 'react'
import { useProducts } from '../hooks/useProducts'
import CloudinaryImage from './CloudinaryImage'
import Icon from './Icon'

const CUANTAS = 6

// Con 103 piezas, entrar por categoría es más rápido que scrollear la
// grilla entera. Las tarjetas salen del catálogo: la foto es de una pieza
// real y el conteo es el de stock del día.
export default function Categories() {
  const { products, categories } = useProducts()

  const tiles = useMemo(() => {
    if (!products.length) return []
    return categories
      .filter(c => c.key !== 'all')
      .map(c => {
        const piezas = products.filter(p => p.category === c.key)
        const conFoto = piezas.find(p => p.image)
        return { ...c, n: piezas.length, image: conFoto?.image || '' }
      })
      .filter(c => c.image)
      .sort((a, b) => b.n - a.n)
      .slice(0, CUANTAS)
  }, [products, categories])

  if (!tiles.length) return null

  return (
    <section className='px-6 py-20 md:px-12 bg-cream'>
      <div className='max-w-screen-xl mx-auto'>
        <div className='flex flex-wrap items-baseline justify-between gap-4 mb-9'>
          <h2 className='font-serif text-[clamp(30px,4vw,42px)] font-light text-dark'>Comprá por categoría</h2>
          <a
            href='/tienda'
            className='inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase text-muted hover:text-gold transition-colors group'
          >
            Ver las {products.length} piezas
            <Icon name='flecha' size={13} className='transition-transform duration-300 group-hover:translate-x-1' />
          </a>
        </div>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 md:gap-5'>
          {tiles.map((c, i) => (
            <a
              key={c.key}
              href={`/tienda/${c.slug}`}
              className='flex flex-col gap-3 group animate-fade-up'
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className='overflow-hidden aspect-square bg-line'>
                <CloudinaryImage
                  src={c.image}
                  alt={c.label}
                  className='object-cover w-full h-full transition-transform duration-700 group-hover:scale-105'
                  fallback={<div className='w-full h-full bg-line' />}
                />
              </div>
              <div>
                <span className='block font-serif text-xl font-light transition-colors text-dark group-hover:text-gold'>
                  {c.label}
                </span>
                <span className='text-xs tracking-wide text-muted'>
                  {c.n} {c.n === 1 ? 'pieza' : 'piezas'}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
