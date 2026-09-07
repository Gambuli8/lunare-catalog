import { useEffect } from 'react'
import { CartProvider }  from './context/CartContext'
import { useRoute }      from './hooks/useRoute'
import Navbar            from './components/Navbar'
import Hero              from './components/Hero'
import Categories        from './components/Categories'
import FeaturedProducts  from './components/FeaturedProducts'
import Trust             from './components/Trust'
import Catalog           from './components/Catalog'
import Contact           from './components/Contact'
import Cuidados          from './components/Cuidados'
import Politicas         from './components/Politicas'
import Arrepentimiento   from './components/Arrepentimiento'
import Panel             from './components/Panel'
import CartSidebar       from './components/CartSidebar'
import ProductPage       from './components/ProductPage'
import Footer            from './components/Footer'
import Toast             from './components/Toast'
import Icon              from './components/Icon'
import { Analytics } from '@vercel/analytics/react'

// El <title> de cada ruta. El servidor ya manda el suyo en el HTML
// (api/page.js y api/shop.js); esto es para cuando se navega dentro de la
// SPA, sin recargar.
const TITULOS = {
  home: 'Lunare Accesorios | Accesorios de Plata y Acero Blanco',
  care: 'Cuidados de tus joyas | Lunare Accesorios',
  policy: 'Cambios y devoluciones | Lunare Accesorios',
  contact: 'Contacto | Lunare Accesorios',
  regret: 'Botón de arrepentimiento | Lunare Accesorios',
  panel: 'Panel | Lunare Accesorios',
  notfound: 'Página no encontrada | Lunare Accesorios',
}

function CierreTienda() {
  return (
    <section className='px-6 pb-24 md:px-12'>
      <div className='flex flex-col items-center max-w-screen-xl gap-5 px-6 py-16 mx-auto text-center border bg-paper border-border md:py-20'>
        <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium'>La colección completa</p>
        <h2 className='font-serif text-[clamp(28px,4vw,40px)] font-light leading-tight text-dark'>
          Todavía hay mucho para ver
        </h2>
        <p className='max-w-md text-[15px] leading-relaxed text-muted'>
          Argollas, pasantes, collares, pulseras, dijes y anillos. Podés filtrar por
          categoría y por material, y ordenar por precio.
        </p>
        <a
          href='/tienda'
          className='inline-flex items-center justify-center w-full gap-3 px-8 py-4 mt-2 text-xs tracking-[0.14em] uppercase transition-colors duration-300 border sm:w-auto border-dark text-dark hover:bg-dark hover:text-cream'
        >
          Ver la tienda
          <Icon name='flecha' size={15} strokeWidth={1.8} />
        </a>
      </div>
    </section>
  )
}

// La home era de casi 12.000 px en el celular: tenía el catálogo entero
// embebido, y encima cuidados y políticas. Ahora es portada, categorías,
// destacados, confianza y un cierre hacia la tienda; el catálogo vive en
// /tienda y cada sección larga tiene su propia dirección.
function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Trust />
      <CierreTienda />
    </>
  )
}

function NotFound() {
  return (
    <div className='flex flex-col items-center gap-4 px-6 py-32 text-center'>
      <h1 className='font-serif text-4xl font-light'>Esta página no existe</h1>
      <p className='max-w-sm text-sm text-muted'>
        Puede que el link esté viejo. Mirá el catálogo, que se actualiza todos los días.
      </p>
      <a
        href='/tienda'
        className='mt-2 border border-dark px-8 py-3.5 text-xs tracking-[0.14em] uppercase hover:bg-dark hover:text-cream transition-colors'
      >
        Ver la tienda
      </a>
    </div>
  )
}

function Vista({ route }) {
  switch (route.name) {
    case 'product':  return <ProductPage slug={route.slug} />
    case 'shop':     return <Catalog route={route} standalone />
    case 'care':     return <Cuidados />
    case 'policy':   return <Politicas />
    case 'contact':  return <Contact />
    case 'regret':   return <Arrepentimiento />
    case 'notfound': return <NotFound />
    default:         return <Home />
  }
}

export default function App() {
  const route = useRoute()

  useEffect(() => {
    // Producto y tienda arman su propio título con el nombre de la pieza
    // o de la categoría.
    if (TITULOS[route.name]) document.title = TITULOS[route.name]
    // Al filtrar dentro de la tienda no conviene saltar arriba: la persona
    // está mirando la grilla.
    if (route.name !== 'shop') window.scrollTo(0, 0)
  }, [route.name, route.slug])

  // El panel es una herramienta interna: no lleva la tienda alrededor ni
  // se mide con analitica.
  if (route.name === 'panel') {
    return (
      <div className='min-h-screen font-sans bg-cream'>
        <Panel />
      </div>
    )
  }

  return (
    <CartProvider>
      <div className='min-h-screen font-sans bg-cream'>
        <Navbar />
        <main>
          <Vista route={route} />
        </main>
        <Footer />
        <CartSidebar />
        <Toast />
        <Analytics />
      </div>
    </CartProvider>
  )
}
