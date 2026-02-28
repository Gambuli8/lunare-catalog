import { useEffect, useState } from 'react'
import { useModal } from '../context/ModalContext'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../hooks/useProducts'

function getMaterialBadgeStyle(material = '') {
  const m = material.toLowerCase().trim()
  if (m === 'plata dorada' || m.includes('dorada')) return { bg: '#b89a6a', text: '#fff' }
  if (m === 'plata')  return { bg: '#ddebff', text: '#1a3a4a' }
  if (m.includes('acero')) return { bg: '#bfe1f6', text: '#1a3a4a' }
  return { bg: '#e8c547', text: '#3d2e00' }
}

function ModalImage({ image, emoji, name }) {
  const [failed, setFailed] = useState(false)
  if (image && !failed) {
    return (
      <img src={image} alt={name} onError={() => setFailed(true)}
        className="w-full h-full object-cover" />
    )
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#ede7df] flex items-center justify-center">
      <span className="text-8xl select-none opacity-60">{emoji}</span>
    </div>
  )
}

const CARE_TIPS = [
  'Guardá en un lugar seco y hermético cuando no la uses.',
  'Evitá el contacto con perfumes, cloro y sudor.',
  'No la uses al dormir ni al bañarte.',
  'Limpiá con un paño suave y seco.',
]

function haptic(ms = 40) {
  if (navigator?.vibrate) navigator.vibrate(ms)
}

export default function ProductModal() {
  const { selectedProduct: p, closeModal } = useModal()
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  // Controla la animación de salida antes de cerrar
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      closeModal()
    }, 280)
  }

  useEffect(() => {
    if (!p) return
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [p])

  useEffect(() => { setAdded(false); setClosing(false) }, [p])

  if (!p) return null

  const badge = getMaterialBadgeStyle(p.material)
  const effectivePrice = p.pricePromo ?? p.price

  const handleAdd = () => {
    haptic(60)
    addItem({ ...p, price: effectivePrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <>
      {/* Overlay — blur + fade */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-[70] bg-black/40"
        style={{ animation: closing ? 'overlayOut 0.28s ease both' : 'overlayIn 0.35s ease both' }}
      />

      {/* Panel centrado */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-2xl bg-[#F9F5F2] shadow-2xl pointer-events-auto flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
          style={{ animation: closing ? 'panelOut 0.28s cubic-bezier(0.4,0,1,1) both' : 'panelIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* Botón cerrar */}
          <button onClick={handleClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center text-[#7a7269] hover:text-[#0e0d0c] hover:bg-[#e8e2da] rounded-full transition-all duration-200 text-sm">
            ✕
          </button>

          {/* Imagen */}
          <div
            className="w-full md:w-2/5 flex-shrink-0 h-56 md:h-auto relative overflow-hidden bg-[#f0ece6]"
            style={{ animation: closing ? 'none' : 'imageReveal 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}
          >
            <ModalImage image={p.image} emoji={p.emoji} name={p.name} />
          </div>

          {/* Contenido */}
          <div
            className="flex-1 overflow-y-auto p-7 flex flex-col gap-5"
            style={{ animation: closing ? 'none' : 'contentReveal 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}
          >
            <span className="self-start text-[9px] tracking-[0.2em] uppercase px-3 py-1 rounded-sm font-sans font-medium"
              style={{ backgroundColor: badge.bg, color: badge.text }}>
              {p.material}
            </span>

            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#b89a6a] font-sans mb-1">{p.category}</p>
              <h2 className="font-serif text-3xl font-light text-[#0e0d0c] leading-tight">{p.name}</h2>
              <p className="text-[12px] text-[#7a7269] mt-1 tracking-wide">{p.subcategory}</p>
            </div>

            {/* Precio */}
            <div className="border-t border-b border-[#e8e2da] py-4">
              {p.pricePromo ? (
                <>
                  <span className="inline-block bg-red-500 text-white text-[9px] tracking-[0.15em] uppercase px-2.5 py-0.5 rounded-sm font-sans mb-2">
                    Oferta
                  </span>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-serif text-[32px] font-medium text-red-600 leading-none">
                      {formatPrice(p.pricePromo)}
                    </span>
                    <span className="font-serif text-[20px] text-[#b8b0a8] line-through leading-none">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="font-serif text-[32px] font-medium text-[#0e0d0c] leading-none">
                  {formatPrice(p.price)}
                </div>
              )}
              <div className="text-[11px] text-[#7a7269] tracking-widest mt-1">
                {p.priceNote === 'par' ? 'precio por par' : 'precio por unidad'}
              </div>
            </div>

            {/* Material */}
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans mb-2">Material</p>
              <p className="text-sm text-[#0e0d0c] leading-relaxed">
                {p.material === 'Plata'
                  ? 'Plata de ley 925 — 92.5% plata pura, hipoalergénica y duradera.'
                  : p.material === 'Plata Dorada'
                  ? 'Plata de ley 925 con baño de oro — hipoalergénica y de larga duración.'
                  : p.material.toLowerCase().includes('acero')
                  ? 'Acero quirúrgico — resistente, hipoalergénico e ideal para uso diario.'
                  : `${p.material} — accesorio de moda de alta calidad.`}
              </p>
            </div>

            {/* Cuidados */}
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#7a7269] font-sans mb-2">Cuidados</p>
              <ul className="flex flex-col gap-1.5">
                {CARE_TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#7a7269]">
                    <span className="text-[#b89a6a] mt-0.5 flex-shrink-0">🌙</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <button onClick={handleAdd}
              className={`w-full flex items-center justify-center gap-2.5 py-4 text-xs tracking-[0.2em] uppercase font-sans transition-all duration-300 mt-auto
                ${added ? 'bg-green-500 text-white' : 'bg-[#0e0d0c] text-white hover:bg-[#b89a6a]'}`}>
              {added ? (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  ¡Agregado al carrito!
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  Agregar al carrito
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Entrada ── */
        @keyframes overlayIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(6px); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); filter: blur(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    filter: blur(0px); }
        }
        @keyframes imageReveal {
          from { opacity: 0; transform: scale(1.06); filter: blur(6px); }
          to   { opacity: 1; transform: scale(1);    filter: blur(0px); }
        }
        @keyframes contentReveal {
          from { opacity: 0; transform: translateX(10px); filter: blur(4px); }
          to   { opacity: 1; transform: translateX(0);    filter: blur(0px); }
        }

        /* ── Salida ── */
        @keyframes overlayOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes panelOut {
          from { opacity: 1; transform: scale(1)    translateY(0);    filter: blur(0px); }
          to   { opacity: 0; transform: scale(0.94) translateY(10px); filter: blur(6px); }
        }
      `}</style>
    </>
  )
}
