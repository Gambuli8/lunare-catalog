const POLICIES = [
  {
    title: 'Cambios',
    items: [
      'Podés realizar el cambio de todos los productos excepto el rubro aros (incluye cuff a presión), por respeto a la higiene y salud de cada persona.',
      'El producto a cambiar debe encontrarse en las mismas condiciones en que se recibió.',
      'Todos los productos son revisados completamente antes de realizar el envío del pedido, de esta forma aseguramos la calidad de los mismos.',
      'Para realizar un cambio escribinos al WhatsApp (2954476558). En caso que necesites hacer un cambio con envío, el mismo debe ser abonado.',
    ],
  },
  {
    title: 'Devoluciones',
    items: [
      'No realizamos devoluciones, solo cambios por otros productos, donde se toma en cuenta el valor abonado en la fecha de compra.',
    ],
  },
  {
    title: 'Garantías',
    items: [
      'Los productos NO tienen garantía. No realizamos cambios o reposiciones de productos por mal uso o desgaste natural de los mismos.',
    ],
  },
]

export default function Politicas() {
  return (
    <section id="politicas" className="py-24 px-6 md:px-12 bg-white">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] tracking-[0.25em] uppercase text-gold font-sans mb-2">Términos y condiciones</p>
        <h2 className="font-serif text-[clamp(36px,5vw,52px)] font-light text-dark mb-12">Políticas de Cambio</h2>

        <div className="flex flex-col gap-12">
          {POLICIES.map(block => (
            <div key={block.title}>
              <h3 className="font-serif text-[28px] font-light text-dark mb-5 pb-3 border-b border-border">{block.title}</h3>
              <ul className="flex flex-col gap-4">
                {block.items.map((item, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <span className="text-base flex-shrink-0 mt-0.5">🌙</span>
                    <p className="text-muted text-sm leading-relaxed font-sans">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
