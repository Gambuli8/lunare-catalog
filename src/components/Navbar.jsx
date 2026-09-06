import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import Icon from './Icon'

const NAV_LINKS = [
  { href: '/',          label: 'Inicio' },
  { href: '/tienda',    label: 'Tienda' },
  { href: '/contacto',  label: 'Contacto' },
  { href: '/cuidados',  label: 'Cuidados' },
  { href: '/cambios',   label: 'Políticas' },
]

export default function Navbar() {
  const { count, setIsOpen } = useCart()
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* Announcement bar */}
      <div className='flex items-center justify-center gap-2.5 h-11 bg-dark text-[#eae4dc] text-xs tracking-wide'>
        <Icon name='pin' size={14} strokeWidth={1.6} className='flex-shrink-0 text-gold-lt' />
        <span>Retiro coordinado en Santa Rosa, La Pampa y Nueva Córdoba</span>
      </div>

      <header className={`sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-[72px] bg-cream/90 backdrop-blur-md border-b border-border transition-shadow duration-300 ${scrolled ? 'shadow-md' : ''}`}>
        {/* ── LOGO "Dream Avenue" ── */}
        <a
          href='/'
          className='flex flex-col leading-none group'
        >
          <span
            className='text-dark group-hover:text-gold transition-colors duration-300'
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '22px', fontWeight: 400, letterSpacing: '0.08em' }}
          >
            Lunare
          </span>
          <span className='text-[8px] tracking-[0.35em] uppercase text-gold font-sans mt-0.5'>Accesorios</span>
        </a>

        {/* Desktop Nav */}
        <nav className='hidden gap-8 md:flex'>
          {NAV_LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className='nav-underline text-xs tracking-widest uppercase text-dark hover:text-gold transition-colors duration-300 font-sans'
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className='flex items-center gap-4'>
          <button
            onClick={() => setIsOpen(true)}
            aria-label='Carrito'
            className='relative text-dark hover:text-gold transition-colors duration-300'
          >
            <svg
              width='22'
              height='22'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.6'
              viewBox='0 0 24 24'
            >
              <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
              <line
                x1='3'
                y1='6'
                x2='21'
                y2='6'
              />
              <path d='M16 10a4 4 0 01-8 0' />
            </svg>
            {count > 0 && <span className='absolute -top-2 -right-2 bg-gold text-white text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-sans font-medium'>{count > 9 ? '9+' : count}</span>}
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className='md:hidden flex flex-col gap-1.5 p-1'
            aria-label='Menú'
          >
            <span className={`block w-5 h-px bg-dark transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-px bg-dark transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-dark transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className='md:hidden fixed top-[124px] left-0 right-0 z-40 bg-cream/95 backdrop-blur-md border-b border-border py-4'>
          {NAV_LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className='block px-8 py-3.5 text-xs tracking-widest uppercase text-dark hover:text-gold transition-colors duration-300 font-sans'
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </>
  )
}
