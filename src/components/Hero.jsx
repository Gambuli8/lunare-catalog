const JEWELS = [
  { color: 'bg-[#d4af6e]', delay: '0s' },
  { color: 'bg-[#a8bcd4]', delay: '0.3s' },
  { color: 'bg-[#e8d5c4]', delay: '0.6s' },
  { color: 'bg-[#c9a96e]', delay: '0.9s' },
  { color: 'bg-[#b5c9d4]', delay: '1.2s' },
  { color: 'bg-[#d4b08a]', delay: '1.5s' },
]

export default function Hero() {
  return (
    <section
      id='inicio'
      className='min-h-[calc(100vh-108px)] grid grid-cols-1 md:grid-cols-2 items-center gap-10 px-6 md:px-12 py-16 overflow-hidden bg-[#F9F5F2]'
    >
      {/* Left content */}
      <div className='animate-fade-up'>
        <p className='text-xs tracking-[0.3em] uppercase text-[#b89a6a] font-sans mb-5'>Nueva Colección</p>
        <h1 className='font-serif text-[clamp(52px,7vw,88px)] font-light leading-[1.0] text-[#0e0d0c] mb-5'>
          Lunare
          <br />
          <em className='italic text-[#b89a6a]'>Accesorios</em>
        </h1>
        <p className='max-w-sm text-base font-light tracking-wide text-[#7a7269] mb-9'>Cada joya, una expresión de tu estilo.</p>
        <div className='flex flex-wrap items-center gap-4'>
          <a
            href='#catalogo'
            className='inline-flex items-center gap-2 bg-[#0e0d0c] text-white border border-[#0e0d0c] px-8 py-3.5 text-xs tracking-[0.15em] uppercase font-sans hover:bg-transparent hover:text-[#0e0d0c] transition-colors duration-300'
          >
            Explorar Tienda
          </a>
          <a
            href='#catalogo'
            className='inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase font-sans text-[#7a7269] hover:text-[#b89a6a] transition-colors duration-300'
          >
            Ver destacados
            <svg
              width='14'
              height='14'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              viewBox='0 0 24 24'
            >
              <path d='M5 12h14M12 5l7 7-7 7' />
            </svg>
          </a>
        </div>
      </div>

      {/* Right visual */}
      <div className='relative flex items-center justify-center h-80 md:h-[480px]'>
        {/* Rotating rings */}
        <div className='absolute w-[300px] md:w-[420px] h-[300px] md:h-[420px] rounded-full border border-[#e8e2da] ring-spin-cw' />
        <div className='absolute w-[220px] md:w-[300px] h-[220px] md:h-[300px] rounded-full border border-dashed border-[#e8e2da] ring-spin-ccw' />

        {/* Center orb */}
        <div className='relative w-52 h-52 md:w-64 md:h-64 bg-gradient-to-br from-white to-[#f0ece6] rounded-full shadow-2xl flex flex-col items-center justify-center'>
          <span className='bg-[#0e0d0c] text-white text-[10px] tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-4'>Plata 925</span>
          <div className='grid grid-cols-3 gap-2.5 mb-4'>
            {JEWELS.map((j, i) => (
              <span
                key={i}
                className={`w-4 h-4 rounded-full ${j.color} animate-pulse2`}
                style={{ animationDelay: j.delay }}
              />
            ))}
          </div>
          <p className='font-serif text-[13px] text-[#7a7269] tracking-[0.15em]'>✦ Jewelry ✦</p>
        </div>

        {/* Floating labels */}
        <div className='absolute top-4 right-4 md:right-8 bg-white border border-[#e8e2da] px-3 py-2 shadow-sm text-xs font-sans tracking-wider text-[#0e0d0c]'>Retiros por Nueva Córdoba</div>
        <div className='absolute bottom-6 left-4 md:left-0 bg-[#0e0d0c] text-white px-3 py-2 text-xs font-sans tracking-wider'>Envíos en Santa Rosa LP</div>
        {/* <div className='absolute bottom-6 right-4 md:right-0 bg-[#0e0d0c] text-white px-3 py-2 text-xs font-sans tracking-wider'>Retiros por Nueva Cordoba</div> */}
      </div>
    </section>
  )
}
