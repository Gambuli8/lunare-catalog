import { useState } from 'react'

const FAQS = [
  {
    q: '¿Hacen envíos a todo el país?',
    a: 'Por el momento no realizamos envíos a todo el país. Podés retirar tu pedido coordinando previamente en Santa Rosa (La Pampa) o en Córdoba.'
  },
  {
    q: '¿Los accesorios se oxidan?',
    a: 'Nuestros accesorios están hechos con materiales de buena calidad, pero recomendamos evitar el contacto con agua, perfumes o cremas para prolongar su duración.',
    link: { text: 'Ver guía de cuidados →', href: '#cuidados' }
  },
  {
    q: '¿Puedo hacer un cambio si no me queda bien?',
    a: 'Sí, podés solicitar un cambio dentro de los días indicados después de recibir tu compra, siempre que el producto esté sin uso.',
    link: { text: 'Ver políticas de cambio →', href: '#politicas' }
  },
  {
    q: '¿Los productos tienen stock disponible?',
    a: 'Sí, todos los productos que aparecen disponibles en la web tienen stock listo para comprar.'
  },
  {
    q: '¿Cómo se coordina el pago?',
    a: 'Una vez que hacés el pedido por WhatsApp coordinamos el método de pago. Aceptamos transferencia bancaria, Mercado Pago o efectivo (para retiros en persona).'
  }
]

function FAQItem({ q, a, link, open, onToggle }) {
  return (
    <div className='border-b border-[#e8e2da] last:border-0'>
      <button
        onClick={onToggle}
        className='flex items-center justify-between w-full gap-4 py-4 text-left group'
      >
        <span className={`font-sans text-sm font-medium transition-colors duration-200 ${open ? 'text-[#b89a6a]' : 'text-[#0e0d0c] group-hover:text-[#b89a6a]'}`}>{q}</span>
        <span
          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300
          ${open ? 'border-[#b89a6a] bg-[#b89a6a] text-white rotate-45' : 'border-[#e8e2da] text-[#7a7269]'}`}
        >
          <svg
            width='10'
            height='10'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            viewBox='0 0 24 24'
          >
            <path d='M12 5v14M5 12h14' />
          </svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${open ? 'max-h-40 pb-4' : 'max-h-0'}`}>
        <p className='font-sans text-sm text-[#7a7269] leading-relaxed'>{a}</p>
        {link && (
          <a
            href={link.href}
            className='inline-block mt-2 text-[12px] font-sans font-medium text-[#b89a6a] hover:text-[#0e0d0c] transition-colors duration-200 tracking-wide'
          >
            {link.text}
          </a>
        )}
      </div>
    </div>
  )
}

function FAQList() {
  const [activeIndex, setActiveIndex] = useState(null)
  const toggle = i => setActiveIndex(prev => (prev === i ? null : i))
  return (
    <div>
      {FAQS.map((faq, i) => (
        <FAQItem
          key={i}
          q={faq.q}
          a={faq.a}
          link={faq.link}
          open={activeIndex === i}
          onToggle={() => toggle(i)}
        />
      ))}
    </div>
  )
}

export default function Contact() {
  return (
    <section
      id='contacto'
      className='px-6 py-24 md:px-12 bg-[#F9F5F2]'
    >
      <div className='grid items-start max-w-5xl grid-cols-1 gap-16 mx-auto md:grid-cols-2 md:gap-24'>
        {/* ── Columna izquierda: Contacto ── */}
        <div>
          <p className='text-[11px] tracking-[0.25em] uppercase text-[#b89a6a] font-sans mb-2'>Hablemos</p>
          <h2 className='font-serif text-[clamp(36px,5vw,52px)] font-light text-[#0e0d0c] mb-5'>Contacto</h2>
          <div className='w-px h-12 bg-[#e8e2da] mb-5' />
          <p className='text-[#7a7269] text-[15px] leading-relaxed mb-10 font-sans'>Ante cualquier duda o consulta, escribinos por WhatsApp o seguinos en Instagram. </p>

          <div className='flex flex-col gap-3'>
            {/* WhatsApp */}
            <a
              href='https://wa.me/542954476558?text=Hola!%20Me%20contacto%20desde%20la%20tienda%20online%20de%20Lunare%20Accesorios'
              target='_blank'
              rel='noreferrer'
              className='group relative overflow-hidden flex items-center gap-4 px-5 py-4 bg-[#0e0d0c] text-white transition-all duration-300'
            >
              <div className='absolute inset-0 bg-[#25D366] translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300 ease-in-out' />
              <div className='relative z-10 flex items-center justify-center flex-shrink-0 w-8 h-8 transition-colors duration-300 rounded-full bg-white/10 group-hover:bg-white/20'>
                <svg
                  width='17'
                  height='17'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <path
                    fill='currentColor'
                    d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z'
                  />
                  <path
                    fill='currentColor'
                    d='M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L.057 23.882a.5.5 0 00.606.61l6.162-1.605A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.694-.5-5.24-1.375l-.374-.217-3.884 1.012 1.053-3.77-.237-.389A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z'
                  />
                </svg>
              </div>
              <div className='relative z-10'>
                <p className='font-sans text-sm font-medium tracking-wide'>WhatsApp</p>
                <p className='text-[11px] text-white/60 group-hover:text-white/80 font-sans mt-0.5 transition-colors duration-300'>+54 2954-476558</p>
              </div>
              <svg
                className='relative z-10 flex-shrink-0 ml-auto transition-all duration-300 opacity-40 group-hover:opacity-100 group-hover:translate-x-1'
                width='14'
                height='14'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                viewBox='0 0 24 24'
              >
                <path d='M5 12h14M12 5l7 7-7 7' />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href='https://instagram.com/lunare.acc'
              target='_blank'
              rel='noreferrer'
              className='group relative overflow-hidden flex items-center gap-4 px-5 py-4 bg-white border border-[#e8e2da] text-[#0e0d0c] transition-all duration-300 hover:border-[#b89a6a]'
            >
              <div className='absolute inset-0 bg-[#b89a6a] translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300 ease-in-out' />
              <div className='relative z-10 w-8 h-8 rounded-full bg-[#0e0d0c] group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 text-white transition-colors duration-300'>
                <svg
                  width='17'
                  height='17'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <path
                    fill='currentColor'
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'
                  />
                </svg>
              </div>
              <div className='relative z-10'>
                <p className='font-sans text-sm font-medium tracking-wide transition-colors duration-300 group-hover:text-white'>Instagram</p>
                <p className='text-[11px] text-[#7a7269] group-hover:text-white/80 font-sans mt-0.5 transition-colors duration-300'>@lunare.acc</p>
              </div>
              <svg
                className='relative z-10 flex-shrink-0 ml-auto transition-all duration-300 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-white'
                width='14'
                height='14'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                viewBox='0 0 24 24'
              >
                <path d='M5 12h14M12 5l7 7-7 7' />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Columna derecha: FAQs ── */}
        <div>
          <p className='text-[11px] tracking-[0.25em] uppercase text-[#b89a6a] font-sans mb-2'>Preguntas frecuentes</p>
          <h2 className='font-serif text-[clamp(28px,4vw,42px)] font-light text-[#0e0d0c] mb-5'>Todo lo que necesitás saber</h2>
          <div className='w-px h-12 bg-[#e8e2da] mb-5' />
          <FAQList />
          <p className='text-sm text-[#7a7269] font-sans mt-6'>
            ¿No encontrás lo que buscás?{' '}
            <a
              href='https://wa.me/542954476558?text=Hola!%20Tengo%20una%20consulta%20sobre%20Lunare%20Accesorios'
              target='_blank'
              rel='noreferrer'
              className='font-medium text-[#0e0d0c] hover:text-[#b89a6a] transition-colors duration-200'
            >
              Escribinos por WhatsApp →
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
