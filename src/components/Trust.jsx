import Icon from './Icon'

const PUNTOS = [
  {
    icono: 'escudo',
    titulo: 'Plata de ley 925',
    texto: '92,5 % de plata pura. También trabajamos plata dorada y acero blanco quirúrgico, hipoalergénico.',
  },
  {
    icono: 'pin',
    titulo: 'Retiro coordinado',
    texto: 'Santa Rosa (La Pampa) y Nueva Córdoba. Coordinamos día y punto de encuentro por WhatsApp.',
  },
  {
    icono: 'cambio',
    titulo: 'Cambios en 10 días',
    texto: 'Sin uso y en las mismas condiciones. Por higiene, los aros y cuffs a presión no se cambian.',
  },
]

export default function Trust() {
  return (
    <section className='px-6 py-16 md:px-12 bg-cream'>
      <div className='grid max-w-screen-xl gap-10 mx-auto md:grid-cols-3 md:gap-14'>
        {PUNTOS.map((p, i) => (
          <div
            key={p.titulo}
            className='flex items-start gap-4 animate-fade-up'
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <Icon name={p.icono} size={26} strokeWidth={1.3} className='flex-shrink-0 mt-1 text-gold' />
            <div>
              <h3 className='mb-2 font-serif text-[22px] font-light text-dark'>{p.titulo}</h3>
              <p className='text-sm leading-relaxed text-muted'>{p.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
