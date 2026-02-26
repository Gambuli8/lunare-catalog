import { CartProvider }  from './context/CartContext'
import { ModalProvider } from './context/ModalContext'
import Navbar            from './components/Navbar'
import Hero              from './components/Hero'
import FeaturedProducts  from './components/FeaturedProducts'
import Catalog           from './components/Catalog'
import Contact           from './components/Contact'
import Cuidados          from './components/Cuidados'
import Politicas         from './components/Politicas'
import CartSidebar       from './components/CartSidebar'
import ProductModal      from './components/ProductModal'
import Footer            from './components/Footer'
import Toast             from './components/Toast'
import { Analytics } from '@vercel/analytics/react'

export default function App() {
  return (
    <CartProvider>
      <ModalProvider>
        <div className='min-h-screen bg-[#F9F5F2] font-sans'>
          <Navbar />
          <main>
            <Hero />
            <FeaturedProducts />
            <Catalog />
            <Contact />
            <Cuidados />
            <Politicas />
          </main>
          <Footer />
          <CartSidebar />
          <ProductModal />
          <Toast />
          <Analytics />
        </div>
      </ModalProvider>
    </CartProvider>
  )
}
