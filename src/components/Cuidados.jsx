const CARE_ITEMS = [
  { title: 'Almacenamiento', text: 'Guardá tu joya en un lugar fresco, seco y preferiblemente hermético para evitar el ennegrecimiento u oxidación.' },
  { title: 'Individual', text: 'Almacená cada una de las piezas de forma individual para evitar que se rayen las unas con las otras.' },
  { title: 'Evitá la madera', text: 'No guardes tu joya directamente en contacto con la madera, ésta a menudo contiene ácidos que pueden afectar la superficie de la plata.' },
  { title: 'Químicos', text: 'No expongas la pieza a agentes corrosivos como el cloro, grasa, sudor, perfume, agentes alcalinos ni a la salinidad por largos períodos.' },
  { title: 'Al dormir y bañarse', text: 'No dejes puesta tu joya al momento de dormir ni de bañarte, ya que en esta última puede exponerse al azufre.' },
  { title: 'Limpieza', text: 'Limpiá tu joya con un paño suave y seco. Para una limpieza más profunda usá un paño de microfibra sin productos abrasivos.' }
]

export default function Cuidados() {
  return (
    <section
      id='cuidados'
      className='px-6 py-24 md:px-12 bg-cream'
    >
      <div className='max-w-4xl mx-auto'>
        <p className='text-[11px] tracking-[0.25em] uppercase text-gold font-sans mb-2'>Guía de cuidado</p>
        <h2 className='font-serif text-[clamp(36px,5vw,52px)] font-light text-dark mb-6'>Cuidados de tus joyas</h2>

        {/* Contenedor de los banners principales */}
        <div className='flex flex-col gap-4 mb-8'>
          <div className='bg-gradient-to-br from-taupe to-[#5c4d43] text-white px-8 py-6 rounded-sm text-[15px] leading-relaxed'>
            La <strong>Plata de ley 925</strong> es una aleación que contiene <strong>92.5%</strong> de plata pura y <strong>7.5%</strong> de otros metales, generalmente cobre.
          </div>

          <div className='bg-gradient-to-br from-taupe to-[#5c4d43] text-white px-8 py-6 rounded-sm text-[15px] leading-relaxed'>
            El <strong>Acero Blanco</strong> posee un baño de otros metales que le da ese brillo característico. Cuanto más lo cuides, más duración tendrá dicho color. Evita mojarlo, no expongas a abrasivos (cremas y perfumes), intenta no dormir con
            los accesorios puestos y podes limpiarlos con un paño seco.
          </div>
        </div>

        {/* Grilla de tarjetas restantes */}
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {CARE_ITEMS.map((item, i) => (
            <div
              key={i}
              className='transition-all duration-300 bg-white border rounded-sm border-border p-7 hover:-translate-y-1 hover:shadow-lg animate-fade-up'
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <span className='block mb-3 text-lg'>🌙</span>
              <h3 className='mb-2 font-serif text-xl font-light text-dark'>{item.title}</h3>
              <p className='text-sm leading-relaxed text-muted'>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
