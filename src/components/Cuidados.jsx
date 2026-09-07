import Icon from './Icon'

const MATERIALES = [
  {
    titulo: 'Plata de ley 925',
    texto: 'Una aleación con 92,5 % de plata pura y 7,5 % de otros metales, generalmente cobre.',
  },
  {
    titulo: 'Acero blanco',
    texto: 'Tiene un baño que le da su brillo característico. Cuanto más lo cuides, más dura ese color: evitá mojarlo y los abrasivos.',
  },
]

const CUIDADOS = [
  { icono: 'caja', titulo: 'Almacenamiento', texto: 'Guardá tu joya en un lugar fresco, seco y preferiblemente hermético, para evitar el ennegrecimiento u oxidación.' },
  { icono: 'chispa', titulo: 'Cada una aparte', texto: 'Almacená las piezas por separado, para evitar que se rayen entre sí.' },
  { icono: 'alerta', titulo: 'Evitá la madera', texto: 'No la guardes en contacto directo con madera: suele contener ácidos que afectan la superficie de la plata.' },
  { icono: 'gota', titulo: 'Químicos', texto: 'No la expongas a cloro, grasa, sudor, perfume, agentes alcalinos ni a la salinidad por períodos largos.' },
  { icono: 'luna', titulo: 'Al dormir y bañarte', texto: 'Sacate la joya para dormir y para bañarte: en la ducha puede exponerse al azufre.' },
  { icono: 'paño', titulo: 'Limpieza', texto: 'Limpiala con un paño suave y seco. Para una limpieza más profunda, un paño de microfibra sin productos abrasivos.' },
]

export default function Cuidados() {
  return (
    <section
      id='cuidados'
      className='px-6 pt-8 pb-24 md:px-12 bg-cream'
    >
      <div className='max-w-5xl mx-auto'>
      <nav aria-label='Ruta de navegación' className='flex items-center gap-2 mb-6 text-xs tracking-wide text-muted'>
        <a href='/' className='inline-block py-1.5 transition-colors hover:text-gold'>Inicio</a>
        <span className='text-[#8f877e]'>/</span>
        <span className='text-dark'>Cuidados</span>
      </nav>
        <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium mb-2'>Guía de cuidado</p>
        <h1 className='font-serif text-[clamp(34px,5vw,52px)] font-light text-dark mb-10'>Cuidados de tus joyas</h1>

        <div className='grid gap-5 mb-14 sm:grid-cols-2'>
          {MATERIALES.map((m, i) => (
            <div
              key={m.titulo}
              className='p-7 border bg-paper border-border animate-fade-up'
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <h3 className='mb-2 font-serif text-[22px] font-light text-dark'>{m.titulo}</h3>
              <p className='text-[15px] leading-relaxed text-muted'>{m.texto}</p>
            </div>
          ))}
        </div>

        <div className='grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3'>
          {CUIDADOS.map((c, i) => (
            <div
              key={c.titulo}
              className='flex items-start gap-4 animate-fade-up'
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <Icon name={c.icono} size={22} strokeWidth={1.3} className='flex-shrink-0 mt-1 text-gold' />
              <div>
                <h3 className='mb-1.5 font-serif text-xl font-light text-dark'>{c.titulo}</h3>
                <p className='text-sm leading-relaxed text-muted'>{c.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
