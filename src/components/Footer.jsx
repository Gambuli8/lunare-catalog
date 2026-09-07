import {
  RAZON_SOCIAL, CUIT, DOMICILIO, DATA_FISCAL_URL, DATA_FISCAL_IMG,
  DEFENSA_CONSUMIDOR_URL, fiscalCompleto,
} from '../lib/fiscal'

const LINKS = [
  { href: '/',          label: 'Inicio' },
  { href: '/tienda',    label: 'Tienda' },
  { href: '/contacto',  label: 'Contacto' },
  { href: '/cuidados',  label: 'Cuidados' },
  { href: '/cambios',   label: 'Políticas' },
]

export default function Footer() {
  return (
    <footer className='px-6 text-center bg-dark text-white/70 py-16'>
      <div className='flex flex-col items-center max-w-lg mx-auto'>
        <span className='font-serif text-2xl tracking-[0.25em] text-white'>LUNARE</span>
        <span className='text-[8px] tracking-[0.35em] uppercase text-gold-lt font-sans mt-1 mb-4'>Accesorios</span>
        <p className='font-serif italic text-[15px] text-white/40 mb-7'>Cada joya, una expresión de tu estilo.</p>
        {/* El py-2 no es estético: sin él estos links miden 17px de alto y
            no llegan ni al mínimo de 24 de WCAG. Acá alcanza con eso —los
            44 completos quedan para los controles del carrito, que son los
            que se tocan de verdad y a los que sí se los di. */}
        <div className='flex flex-wrap justify-center gap-x-6 gap-y-1 mb-7'>
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className='py-2 text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-gold-lt transition-colors duration-200 font-sans'
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* La Resolución 424/2020 pide que este link sea de acceso fácil y
            directo desde la home y que ocupe un lugar destacado en visibilidad
            y tamaño. Por eso va aparte de la fila de arriba, con borde y con
            el nombre exacto que nombra la norma. */}
        <a
          href='/arrepentimiento'
          className='inline-flex items-center justify-center w-full px-6 py-4 text-xs tracking-[0.14em] uppercase transition-colors duration-300 border sm:w-auto border-gold-lt text-gold-lt hover:bg-gold-lt hover:text-dark'
        >
          Botón de arrepentimiento
        </a>

        <a
          href={DEFENSA_CONSUMIDOR_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-6 text-[11px] tracking-wider text-white/45 underline hover:text-gold-lt transition-colors'
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

        <p className='mt-8 text-[11px] tracking-wider text-white/25'>© 2026 Lunare Accesorios. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
