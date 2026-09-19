import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../hooks/useProducts'
import {
  leerPagoPendiente, borrarPagoPendiente, posponerPagoPendiente, estaPospuesto,
} from '../lib/pagoPendiente'
import Icon, { WhatsAppIcon } from './Icon'

const WHATSAPP = '542954476558'

// Aparece cuando alguien vuelve a la tienda con un pedido de Mercado Pago
// sin pagar: tocó "atrás" en Mercado Pago, cerró la pestaña o lo dejó
// para después. Le recuerda que las piezas están reservadas y le da tres
// salidas: terminar el pago, consultar por WhatsApp o dejarlo para luego.
//
// Antes de mostrarse le pregunta al servidor si el pedido sigue
// pendiente, para no pedirle que pague a alguien que ya pagó.

export default function PagoPendiente() {
  const { setIsOpen } = useCart()
  const [pendiente, setPendiente] = useState(null)

  useEffect(() => {
    let vigente = true

    const revisar = async () => {
      const p = leerPagoPendiente()
      if (!p || estaPospuesto(p.numero)) return

      try {
        const res = await fetch(`/api/pedido-estado?id=${encodeURIComponent(p.id)}`, { cache: 'no-store' })
        if (res.status === 404) { borrarPagoPendiente(); return }
        const data = await res.json().catch(() => null)
        if (data?.ok && data.estado !== 'pendiente') { borrarPagoPendiente(); return }
      } catch {
        // Si no se puede consultar, se muestra igual: el texto aclara que
        // si ya pagó no tiene que hacer nada.
      }

      if (!vigente) return
      setIsOpen(false)
      setPendiente(p)
    }

    revisar()

    // Al volver con "atrás" desde Mercado Pago, muchos navegadores
    // restauran la página congelada y React no se vuelve a montar.
    const alVolver = e => { if (e.persisted) revisar() }
    window.addEventListener('pageshow', alVolver)
    return () => {
      vigente = false
      window.removeEventListener('pageshow', alVolver)
    }
  }, [setIsOpen])

  const ahoraNo = () => {
    if (pendiente) posponerPagoPendiente(pendiente.numero)
    setPendiente(null)
  }

  useEffect(() => {
    if (!pendiente) return
    const onKey = e => { if (e.key === 'Escape') ahoraNo() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [pendiente])

  if (!pendiente) return null

  const consulta = `¡Hola! Hice el pedido ${pendiente.numero} en la web y tengo una consulta antes de pagar.`

  return (
    <div className='fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6'>
      <div onClick={ahoraNo} className='absolute inset-0 bg-dark/50 backdrop-blur-[2px] animate-aparece motion-reduce:animate-none' />

      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='pago-pendiente-titulo'
        className='relative w-full sm:max-w-md bg-cream px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 shadow-2xl animate-sube motion-reduce:animate-none'
      >
        <button
          onClick={ahoraNo}
          aria-label='Cerrar'
          className='absolute flex items-center justify-center w-11 h-11 top-2 right-2 text-muted hover:text-dark'
        >
          <Icon name='cerrar' size={17} strokeWidth={1.8} />
        </button>

        <span className='grid w-12 h-12 border rounded-full place-items-center border-gold-lt text-gold'>
          <Icon name='reloj' size={22} strokeWidth={1.5} />
        </span>

        <p className='mt-5 text-[11px] tracking-[0.18em] uppercase text-muted'>
          Pedido <span className='text-gold'>{pendiente.numero}</span>
        </p>
        <h2 id='pago-pendiente-titulo' className='mt-1.5 font-serif text-[30px] font-light leading-tight text-dark'>
          Tu pedido te está esperando
        </h2>
        <p className='mt-3 text-[15px] leading-relaxed text-muted'>
          Todavía no se completó el pago de <b className='font-medium text-dark'>{formatPrice(pendiente.total)}</b>.
          Te reservamos las piezas por 24 horas para que lo termines cuando puedas.
        </p>

        <div className='flex flex-col gap-2.5 mt-6'>
          <a
            href={pendiente.url}
            className='flex items-center justify-center gap-2.5 min-h-[52px] px-6 text-xs tracking-[0.14em] uppercase transition-colors bg-dark text-cream hover:bg-[#2e2a26]'
          >
            Terminar el pago
            <Icon name='flecha' size={14} strokeWidth={1.9} />
          </a>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(consulta)}`}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center justify-center gap-2.5 min-h-[52px] px-6 text-xs tracking-[0.14em] uppercase transition-colors border border-wa text-wa hover:bg-wa hover:text-cream'
          >
            <WhatsAppIcon size={17} />
            Tengo una duda
          </a>
          <button
            onClick={ahoraNo}
            className='min-h-[44px] text-[13px] text-muted hover:text-dark transition-colors'
          >
            Ahora no
          </button>
        </div>

        <p className='pt-4 mt-2 text-[12.5px] leading-relaxed border-t text-soft border-border'>
          Si ya pagaste, no tenés que hacer nada: a veces tarda unos minutos en acreditarse.
        </p>
      </div>
    </div>
  )
}
