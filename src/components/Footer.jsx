import {
  RAZON_SOCIAL, CUIT, DOMICILIO, DATA_FISCAL_URL, DATA_FISCAL_IMG,
  DEFENSA_CONSUMIDOR_URL, fiscalCompleto,
} from '../lib/fiscal'
import { WHATSAPP_URL, INSTAGRAM_URL, INSTAGRAM_USUARIO, RETIROS } from '../lib/contacto'
import Icon, { WhatsAppIcon } from './Icon'

// ── Pie ───────────────────────────────────────────────────────
// Antes repetía los cinco links del menú de arriba. Con la cabecera
// pegada al tope de la pantalla, esos links están siempre a un toque, así
// que repetirlos no le servía a nadie.
//
// Ahora lleva lo que no está en ningún otro lado fijo: por dónde
// escribirnos —que es por donde se vende— y dónde se retira.

export default function Footer() {
  return (
    <footer className='px-6 text-center bg-dark text-white/70 py-16'>
      <div className='flex flex-col items-center max-w-lg mx-auto'>
        <span className='font-serif text-2xl tracking-[0.25em] text-white'>LUNARE</span>
        <span className='text-[8px] tracking-[0.35em] uppercase text-gold-lt font-sans mt-1 mb-4'>Accesorios</span>
        <p className='font-serif italic text-[15px] text-white/40 mb-7'>Cada joya, una expresión de tu estilo.</p>

        {/* El canal de venta. Se abren en otra pestaña porque llevan fuera
            del sitio, y el min-h-[44px] es el área táctil del celular. */}
        <div className='flex flex-wrap justify-center gap-x-7 gap-y-1'>
          <a
            href={WHATSAPP_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2.5 min-h-[44px] px-1 text-[13px] text-white/60 hover:text-gold-lt transition-colors duration-200'
          >
            <WhatsAppIcon size={16} />
            Escribinos por WhatsApp
          </a>
          <a
            href={INSTAGRAM_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2.5 min-h-[44px] px-1 text-[13px] text-white/60 hover:text-gold-lt transition-colors duration-200'
          >
            <Icon name='instagram' size={16} strokeWidth={1.6} />
            @{INSTAGRAM_USUARIO}
          </a>
        </div>

        <p className='flex items-center justify-center gap-2 mt-5 text-[12px] leading-relaxed text-white/40'>
          <Icon name='pin' size={14} strokeWidth={1.5} className='flex-shrink-0 text-gold-lt' />
          Retiro coordinado en {RETIROS}
        </p>

        <a
          href={DEFENSA_CONSUMIDOR_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center min-h-[44px] mt-6 text-[11px] tracking-wider text-white/45 underline hover:text-gold-lt transition-colors'
        >
          Defensa de las y los Consumidores. Para reclamos, ingresá acá
        </a>

        {fiscalCompleto() && (
          <div className='flex flex-col items-center gap-3 pt-8 mt-8 border-t border-white/10 w-full'>
            <p className='text-[11px] leading-relaxed text-white/35'>
              {RAZON_SOCIAL} · CUIT {CUIT}
              <br />
              {DOMICILIO}
            </p>
            {DATA_FISCAL_URL && (
              <a href={DATA_FISCAL_URL} target='_blank' rel='noopener noreferrer'>
                <img
                  src={DATA_FISCAL_IMG}
                  alt='Data Fiscal — ARCA'
                  width={44}
                  height={62}
                  loading='lazy'
                  className='h-[62px] w-auto'
                />
              </a>
            )}
          </div>
        )}

        {/* El año salía escrito a mano: en enero quedaba viejo y nadie se
            iba a dar cuenta. */}
        <p className='mt-8 text-[11px] tracking-wider text-white/25'>
          © {new Date().getFullYear()} Lunare Accesorios. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
