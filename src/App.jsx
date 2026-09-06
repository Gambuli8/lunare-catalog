import { useEffect } from 'react'
import { CartProvider }  from './context/CartContext'
import { useRoute }      from './hooks/useRoute'
import Navbar            from './components/Navbar'
import Hero              from './components/Hero'
import FeaturedProducts  from './components/FeaturedProducts'
import Categories        from './components/Categories'
import Trust             from './components/Trust'
import Catalog           from './components/Catalog'
import Contact           from './components/Contact'
import Cuidados          from './components/Cuidados'
import Politicas         from './components/Politicas'
import CartSidebar       from './components/CartSidebar'
import ProductPage       from './components/ProductPage'
import Footer            from './components/Footer'
import Toast             from './components/Toast'
import { Analytics } from '@vercel/analytics/react'

const HOME_TITLE = 'Lunare Accesorios | Accesorios de Plata y Acero Blanco'

function Home({ anchor, route }) {
  // /tienda, /cuidados y /cambios son direcciones reales que llevan a su
  // sección: sirven para compartir y para que Google las indexe por
  // separado, sin partir la home en varias páginas.
  useEffect(() => {
    if (!anchor) return
    const scroll = () => {
      const el = document.getElementById(anchor)
      // 80 px de aire para que la sección no quede debajo del header fijo.
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'auto' })
    }
    const frame = requestAnimationFrame(scroll)
    // El catálogo arranca con esqueletos: cuando entran los productos la
    // sección cambia de alto, así que reajustamos una vez más.
    const settle = setTimeout(scroll, 700)
    return () => { cancelAnimationFrame(frame); clearTimeout(settle) }
  }, [anchor])

  return (
    <>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Trust />
      <Catalog route={route} />
      <Contact />
      <Cuidados />
      <Politicas />
    </>
  )
}

function NotFound() {
  return (
    <div className='flex flex-col items-center gap-4 px-6 py-32 text-center'>
      <h1 className='font-serif text-4xl font-light'>Esta página no existe</h1>
      <p className='text-sm text-[#5f574e] max-w-sm'>
        Puede que el link esté viejo. Mirá el catálogo, que se actualiza todos los días.
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

export default function App() {
  const route = useRoute()

  useEffect(() => {
    if (route.name === 'home') document.title = HOME_TITLE
    // Al filtrar dentro de la tienda no conviene saltar arriba: la persona
    // está mirando la grilla.
    if (route.name !== 'shop' && !route.anchor) window.scrollTo(0, 0)
  }, [route.name, route.slug, route.anchor])

  return (
    <CartProvider>
      <div className='min-h-screen bg-[#F9F5F2] font-sans'>
        <Navbar />
        <main>
          {route.name === 'product'
            ? <ProductPage slug={route.slug} />
            : route.name === 'shop'
              ? <Catalog route={route} standalone />
              : route.name === 'notfound'
                ? <NotFound />
                : <Home anchor={route.anchor} route={route} />}
        </main>
        <Footer />
        <CartSidebar />
        <Toast />
        <Analytics />
      </div>
    </CartProvider>
  )
}
