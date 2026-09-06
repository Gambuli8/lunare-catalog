import Icon from './Icon'

const POLICIES = [
  {
    title: 'Cambios',
    items: [
      'Podés realizar el cambio de todos los productos excepto el rubro aros (incluye cuff a presión), por respeto a la higiene y salud de cada persona.',
      'El producto a cambiar debe encontrarse en las mismas condiciones en que se recibió. Tené en cuenta que contás con un plazo máximo de 10 días corridos desde la compra para solicitar el cambio; pasado ese tiempo no se aceptarán devoluciones.',
      'Todos los productos son revisados completamente antes de realizar el envío del pedido, de esta forma aseguramos la calidad de los mismos.',
      'Para realizar un cambio escribinos al WhatsApp (2954476558). En caso que necesites hacer un cambio con envío, el mismo debe ser abonado.'
    ]
  },
  {
    title: 'Devoluciones',
    items: ['No realizamos devoluciones, solo cambios por otros productos, donde se toma en cuenta el valor abonado en la fecha de compra.']
  },
  {
    title: 'Garantías',
    items: ['Los productos NO tienen garantía. No realizamos cambios o reposiciones de productos por mal uso o desgaste natural de los mismos.']
  }
]

export default function Politicas() {
  return (
    <section
      id='politicas'
      className='px-6 pt-8 pb-24 md:px-12 bg-paper'
    >
      <div className='max-w-3xl mx-auto'>
      <nav aria-label='Ruta de navegación' className='flex items-center gap-2 mb-6 text-xs tracking-wide text-muted'>
        <a href='/' className='transition-colors hover:text-gold'>Inicio</a>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
