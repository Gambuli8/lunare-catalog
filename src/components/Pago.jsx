import { useEffect } from 'react'
import Icon from './Icon'

// ── Vuelta de Mercado Pago ────────────────────────────────────
// Adonde caen las back_urls de la preferencia.
//
// ⚠️ Esta pantalla no decide nada: lo que dice la URL es solo lo que
// Mercado Pago le contó al navegador, y cualquiera puede escribirla a
// mano. El pedido pasa a "pagado" únicamente por el webhook, después de
// que el servidor le pregunte a Mercado Pago cuánto se cobró.
//
// Por eso el texto de éxito habla de que el pago salió bien, no de que
// el pedido esté confirmado como pagado en la base.

const WHATSAPP = '542954476558'

const ESTADOS = {
  exito: {
    icono: 'check',
    titulo: 'Listo, el pago salió bien',
    texto: 'Ya nos llegó el aviso. Estamos preparando tu pedido y te escribimos por WhatsApp para coordinar la entrega.',
    tono: 'text-gold',
  },
  pendiente: {
    icono: 'reloj',
    titulo: 'El pago quedó en camino',
    texto: 'Mercado Pago todavía lo está procesando. Puede tardar un rato, sobre todo si pagaste con efectivo o transferencia. Te avisamos apenas se acredite.',
    tono: 'text-gold',
  },
  error: {
    icono: 'alerta',
    titulo: 'El pago no se pudo completar',
    texto: 'No se descontó nada. Podés intentar de nuevo o escribirnos y lo arreglamos por WhatsApp.',
    tono: 'text-sale',
  },
}

export default function Pago({ route }) {
  const estado = ESTADOS[route?.query?.estado] || ESTADOS.pendiente
  const numero = route?.query?.pedido || ''

  // Es una pantalla de trámite, no tiene nada que hacer en Google.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <section className='px-6 py-20 md:px-12 bg-paper'>
      <div className='flex flex-col items-center max-w-md mx-auto text-center'>
        <Icon name={estado.icono} size={32} strokeWidth={1.5} className={estado.tono} />

        <h1 className='mt-6 font-serif text-[clamp(28px,5vw,40px)] font-light leading-tight text-dark'>
          {estado.titulo}
        </h1>

        {numero && (
          <>
            <p className='mt-6 text-[13px] tracking-[0.14em] uppercase text-muted'>Tu pedido</p>
            <span className='font-serif text-[34px] tracking-wider text-gold'>{numero}</span>
          </>
        )}

        <p className='mt-5 text-[15px] leading-relaxed text-muted'>{estado.texto}</p>

        <div className='flex flex-col w-full gap-3 mt-9 sm:flex-row sm:justify-center'>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 text-xs tracking-[0.14em] uppercase transition-colors bg-wa text-cream hover:bg-wa-dark'
          >
            Escribirnos por WhatsApp
          </a>
          <a
            href='/tienda'
            className='inline-flex items-center justify-center min-h-[52px] px-7 text-xs tracking-[0.14em] uppercase transition-colors border border-dark text-dark hover:bg-dark hover:text-cream'
          >
            Volver a la tienda
          </a>
        </div>

        <p className='mt-10 text-[12.5px] leading-relaxed text-soft'>
          Guardá el número del pedido. Si algo no cierra, escribinos con ese número
          y lo miramos.
        </p>
      </div>
    </section>
  )
}
