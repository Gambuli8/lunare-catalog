import { useState } from 'react'
import Icon, { WhatsAppIcon } from './Icon'

const WHATSAPP = 'https://wa.me/542954476558'
const INSTAGRAM = 'https://instagram.com/lunare.acc'

const FAQS = [
  {
    q: '¿Hacen envíos a todo el país?',
    a: 'Por el momento no. Podés retirar tu pedido coordinando previamente en Santa Rosa (La Pampa) o en Nueva Córdoba.',
  },
  {
    q: '¿Los accesorios se oxidan?',
    a: 'Están hechos con materiales de buena calidad, pero conviene evitar el contacto con agua, perfumes o cremas para prolongar su duración.',
    link: { text: 'Ver la guía de cuidados', href: '/cuidados' },
  },
  {
    q: '¿Puedo cambiar una pieza si no me queda bien?',
    a: 'Sí, dentro de los 10 días corridos y siempre que esté sin uso. Por higiene, los aros y cuffs a presión no se cambian.',
    link: { text: 'Ver las políticas de cambio', href: '/cambios' },
  },
  {
    q: '¿Los productos tienen stock?',
    a: 'Sí. Todo lo que aparece en la web tiene stock listo para comprar: las piezas agotadas se sacan del catálogo automáticamente.',
  },
  {
    q: '¿Cómo se coordina el pago?',
    a: 'Una vez que hacés el pedido por WhatsApp coordinamos el método: transferencia bancaria, Mercado Pago o efectivo al retirar.',
  },
]

function FAQItem({ q, a, link, open, onToggle }) {
  return (
    <div className='border-b border-border last:border-0'>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className='flex items-center justify-between w-full gap-4 py-5 text-left group'
      >
        <span className={`text-[15px] transition-colors duration-200 ${open ? 'text-gold' : 'text-dark group-hover:text-gold'}`}>
          {q}
        </span>
        <Icon
          name='chevron'
          size={17}
          strokeWidth={1.7}
          className={`flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-gold' : 'text-soft'}`}
        />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-400 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className='overflow-hidden'>
          <p className='text-[15px] leading-relaxed text-muted pb-5 max-w-2xl'>
            {a}
            {link && (
              <>
                {' '}
                <a href={link.href} className='inline-flex items-center gap-1 text-gold hover:underline'>
                  {link.text}
                  <Icon name='flecha' size={12} strokeWidth={2} />
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Contact() {
  const [abierta, setAbierta] = useState(0)

  return (
    <section
      id='contacto'
      className='px-6 pt-8 pb-24 md:px-12 bg-paper'
    >
      <div className='max-w-5xl mx-auto'>

      <nav aria-label='Ruta de navegación' className='flex items-center gap-2 mb-6 text-xs tracking-wide text-muted'>
        <a href='/' className='transition-colors hover:text-gold'>Inicio</a>
        <span className='text-[#8f877e]'>/</span>
        <span className='text-dark'>Contacto</span>
      </nav>
        <div className='flex flex-col gap-3 mb-10'>
          <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium'>Hablemos</p>
          <h1 className='font-serif text-[clamp(34px,5vw,52px)] font-light text-dark'>Contacto</h1>
          <p className='max-w-md text-[16px] leading-relaxed text-muted'>
            Ante cualquier duda escribinos por WhatsApp o seguinos en Instagram. Respondemos todos los días.
          </p>
        </div>

        <div className='grid gap-4 mb-16 sm:grid-cols-2'>
          <a
            href={WHATSAPP}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-4 p-6 transition-all duration-300 border bg-cream border-border hover:border-gold hover:-translate-y-1'
          >
            <span className='text-wa'><WhatsAppIcon size={26} /></span>
            <span>
              <span className='block font-serif text-[22px] font-light text-dark'>WhatsApp</span>
              <span className='text-sm text-muted'>+54 2954 476558</span>
            </span>
          </a>

          <a
            href={INSTAGRAM}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-4 p-6 transition-all duration-300 border bg-cream border-border hover:border-gold hover:-translate-y-1'
          >
            <Icon name='instagram' size={26} strokeWidth={1.4} className='text-gold' />
            <span>
              <span className='block font-serif text-[22px] font-light text-dark'>Instagram</span>
              <span className='text-sm text-muted'>@lunare.acc</span>
            </span>
          </a>
        </div>

        <div className='flex flex-col gap-3 mb-6'>
          <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium'>Preguntas frecuentes</p>
          <h3 className='font-serif text-[clamp(26px,3.4vw,34px)] font-light text-dark'>Todo lo que necesitás saber</h3>
        </div>

        <div className='max-w-3xl'>
          {FAQS.map((f, i) => (
            <FAQItem
              key={f.q}
              {...f}
              open={abierta === i}
              onToggle={() => setAbierta(abierta === i ? -1 : i)}
            />
          ))}
        </div>

        <p className='mt-10 text-sm text-muted'>
          ¿No encontrás lo que buscás?{' '}
          <a
            href={WHATSAPP}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-gold hover:underline'
          >
            Escribinos por WhatsApp
            <Icon name='flecha' size={12} strokeWidth={2} />
          </a>
        </p>

      </div>
    </section>
  )
}
