import { useState } from 'react'

export default function Contact() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSent(true)
    e.target.reset()
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <section id="contacto" className="px-6 py-24 md:px-12 bg-cream">
      <div className="grid items-start max-w-5xl grid-cols-1 gap-16 mx-auto md:grid-cols-2 md:gap-24">

        {/* Info */}
        <div>
          <p className="text-[11px] tracking-[0.25em] uppercase text-gold font-sans mb-2">Hablemos</p>
          <h2 className="font-serif text-[clamp(36px,5vw,52px)] font-light text-dark mb-5">Contacto</h2>
          <p className="text-muted leading-relaxed mb-8 text-[15px]">
            Ante cualquier duda o consulta, envianos un mensaje directo a nuestro Instagram{' '}
            <a href="https://instagram.com/lunare.acc" target="_blank" className="font-medium transition-colors text-dark hover:text-gold">
              @lunare.acc
            </a>
          </p>
          <ul className="flex flex-col gap-4">
            {[
              { icon: '💬', text: '+54 2954-476558', href: 'https://wa.me/542954476558' },
              { icon: '✉️', text: 'lunarejewelry.shop@gmail.com', href: 'mailto:lunarejewelry.shop@gmail.com' },
              { icon: '📸', text: '@lunare.acc', href: 'https://instagram.com/lunare.acc' },
            ].map(item => (
              <li key={item.text} className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <a href={item.href} target="_blank" rel="noreferrer"
                  className="text-[14px] text-dark hover:text-gold transition-colors duration-200 font-sans">
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            {['Nombre', 'Apellido'].map(l => (
              <div key={l} className="flex flex-col gap-1.5">
                <label className="text-[11px] tracking-[0.15em] uppercase text-muted font-sans">{l}</label>
                <input type="text" required placeholder={`Tu ${l.toLowerCase()}`}
                  className="w-full px-4 py-3 font-sans text-sm transition-colors duration-200 bg-white border rounded-sm outline-none border-border text-dark focus:border-gold" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.15em] uppercase text-muted font-sans">Email</label>
            <input type="email" required placeholder="tu@email.com"
              className="px-4 py-3 font-sans text-sm transition-colors duration-200 bg-white border rounded-sm outline-none border-border text-dark focus:border-gold" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.15em] uppercase text-muted font-sans">Teléfono</label>
            <input type="tel" placeholder="+54 000 000 0000"
              className="px-4 py-3 font-sans text-sm transition-colors duration-200 bg-white border rounded-sm outline-none border-border text-dark focus:border-gold" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.15em] uppercase text-muted font-sans">Mensaje</label>
            <textarea rows={4} required placeholder="¿En qué podemos ayudarte?"
              className="px-4 py-3 font-sans text-sm transition-colors duration-200 bg-white border rounded-sm outline-none resize-none border-border text-dark focus:border-gold" />
          </div>
          <button type="submit"
            className="bg-dark text-white border border-dark px-8 py-3.5 text-xs tracking-[0.15em] uppercase font-sans hover:bg-transparent hover:text-dark transition-colors duration-300 self-start">
            {sent ? '✓ Mensaje enviado' : 'Enviar mensaje'}
          </button>
        </form>

      </div>
    </section>
  )
}
