import Icon from './Icon'

// ⚠️ Antes esta página decía "no realizamos devoluciones" y "los
// productos NO tienen garantía". En una compra a distancia las dos cosas
// van contra la Ley 24.240: el derecho a arrepentirse no se puede
// renunciar (art. 34) y la garantía legal no se puede excluir (art. 11).
// Los cambios por gusto sí son política de la tienda y pueden tener sus
// condiciones. Este texto lo tiene que validar quien asesore al negocio.
const POLICIES = [
  {
    title: 'Arrepentimiento y devoluciones',
    items: [
      'Si compraste por la web, tenés 10 días corridos desde que recibiste el producto para arrepentirte de la compra, sin dar explicaciones y sin ningún costo (Ley 24.240, art. 34).',
      'Lo pedís desde el Botón de arrepentimiento: te damos el código del trámite en el momento. El producto tiene que volver sin uso y en las mismas condiciones en que lo recibiste.',
      'Te devolvemos el total de lo que pagaste por el mismo medio de pago. Los gastos de la devolución corren por nuestra cuenta.',
    ],
    link: { text: 'Ir al Botón de arrepentimiento', href: '/arrepentimiento' },
  },
  {
    title: 'Cambios',
    items: [
      'Podés cambiar cualquier producto excepto los aros (incluye cuff a presión), por respeto a la higiene y salud de cada persona.',
      'El producto a cambiar tiene que estar en las mismas condiciones en que se recibió. Tenés 10 días corridos desde la compra para pedir el cambio.',
      'Se toma en cuenta el valor que pagaste el día de la compra. Si el cambio necesita un envío, lo abonás vos.',
      'Para hacer un cambio escribinos por WhatsApp al 2954 476558.',
    ],
  },
  {
    title: 'Garantía',
    items: [
      'Todos los productos se revisan uno por uno antes de despacharlos.',
      'Si una pieza tiene un defecto de fabricación, te la cambiamos por otra igual o te devolvemos el dinero. La garantía legal es de 6 meses desde que la recibiste (Ley 24.240, art. 11).',
      'La garantía no cubre el desgaste natural ni los daños por mal uso: golpes, contacto con agua, perfumes, cremas o productos de limpieza.',
    ],
  },
]

export default function Politicas() {
  return (
    <section
      id='politicas'
      className='px-6 pt-8 pb-24 md:px-12 bg-paper'
    >
      <div className='max-w-3xl mx-auto'>
      <nav aria-label='Ruta de navegación' className='flex items-center gap-2 mb-6 text-xs tracking-wide text-muted'>
        <a href='/' className='inline-flex items-center min-h-[44px] transition-colors hover:text-gold'>Inicio</a>
        <span className='text-[#8f877e]'>/</span>
        <span className='text-dark'>Cambios</span>
      </nav>
        <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium mb-2'>Términos y condiciones</p>
        <h1 className='font-serif text-[clamp(34px,5vw,52px)] font-light text-dark mb-12'>Cambios y devoluciones</h1>

        <div className='flex flex-col gap-12'>
          {POLICIES.map(block => (
            <div key={block.title}>
              <h3 className='font-serif text-[28px] font-light text-dark mb-5 pb-3 border-b border-border'>{block.title}</h3>
              <ul className='flex flex-col gap-4'>
                {block.items.map((item, i) => (
                  <li
                    key={i}
                    className='flex items-start gap-3.5'
                  >
                    <Icon name='check' size={16} strokeWidth={1.8} className='flex-shrink-0 mt-1 text-gold' />
                    <p className='text-[15px] leading-relaxed text-muted'>{item}</p>
                  </li>
                ))}
              </ul>
              {block.link && (
                <a
                  href={block.link.href}
                  className='inline-flex items-center gap-2 mt-6 min-h-[44px] px-6 text-xs tracking-[0.14em] uppercase border border-dark text-dark hover:bg-dark hover:text-cream transition-colors'
                >
                  {block.link.text}
                  <Icon name='flecha' size={14} strokeWidth={1.8} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
