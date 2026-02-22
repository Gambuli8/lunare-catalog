const LINKS = [
  { href: '#inicio',    label: 'Inicio' },
  { href: '#catalogo',  label: 'Tienda' },
  { href: '#contacto',  label: 'Contacto' },
  { href: '#cuidados',  label: 'Cuidados' },
  { href: '#politicas', label: 'Políticas' },
]

export default function Footer() {
  return (
    <footer className="px-6 text-center bg-dark text-white/70 py-14">
      <div className="flex flex-col items-center max-w-lg mx-auto">
        <span className="font-serif text-2xl tracking-[0.25em] text-white">LUNARE</span>
        <span className="text-[8px] tracking-[0.35em] uppercase text-gold-lt font-sans mt-1 mb-4">Accesorios</span>
        <p className="font-serif italic text-[15px] text-white/40 mb-7">Cada joya, una expresión de tu estilo.</p>
        <div className="flex flex-wrap justify-center gap-6 mb-7">
          {LINKS.map(l => (
            <a key={l.href} href={l.href}
              className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-gold-lt transition-colors duration-200 font-sans">
              {l.label}
            </a>
          ))}
        </div>
        <p className="text-[11px] tracking-wider text-white/25">© 2025 Lunare Accesorios. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
