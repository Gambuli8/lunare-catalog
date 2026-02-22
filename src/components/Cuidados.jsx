const CARE_ITEMS = [
  { title: 'Almacenamiento', text: 'Guardá tu joya en un lugar fresco, seco y preferiblemente hermético para evitar el ennegrecimiento u oxidación.' },
  { title: 'Individual',     text: 'Almacená cada una de las piezas de forma individual para evitar que se rayen las unas con las otras.' },
  { title: 'Evitá la madera', text: 'No guardes tu joya directamente en contacto con la madera, ésta a menudo contiene ácidos que pueden afectar la superficie de la plata.' },
  { title: 'Químicos',       text: 'No expongas la pieza a agentes corrosivos como el cloro, grasa, sudor, perfume, agentes alcalinos ni a la salinidad por largos períodos.' },
  { title: 'Al dormir y bañarse', text: 'No dejes puesta tu joya al momento de dormir ni de bañarte, ya que en esta última puede exponerse al azufre.' },
  { title: 'Limpieza',       text: 'Limpiá tu joya con un paño suave y seco. Para una limpieza más profunda usá un paño de microfibra sin productos abrasivos.' },
]

export default function Cuidados() {
  return (
    <section id="cuidados" className="py-24 px-6 md:px-12 bg-cream">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] tracking-[0.25em] uppercase text-gold font-sans mb-2">Guía de cuidado</p>
        <h2 className="font-serif text-[clamp(36px,5vw,52px)] font-light text-dark mb-6">Cuidados de tus joyas</h2>

        <div className="bg-gradient-to-br from-taupe to-[#5c4d43] text-white px-8 py-6 rounded-sm mb-8 text-[15px] leading-relaxed">
          La <strong>Plata de ley 925</strong> es una aleación que contiene <strong>92.5%</strong> de plata pura y <strong>7.5%</strong> de otros metales, generalmente cobre.
        </div>

        <p className="text-muted leading-loose mb-12 text-[15px]">
          Antes queremos aclarar que ninguno de nuestros productos se oxida (esto solo sucede con accesorios de fantasía). Igualmente, a pesar de que todos nuestros productos sean de Plata 925, requieren ciertos cuidados.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARE_ITEMS.map((item, i) => (
            <div key={i}
              className="bg-white border border-border p-7 rounded-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 animate-fade-up"
              style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="block text-lg mb-3">🌙</span>
              <h3 className="font-serif text-xl font-light text-dark mb-2">{item.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
