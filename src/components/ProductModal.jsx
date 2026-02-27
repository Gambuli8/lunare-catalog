import { useEffect, useState, useRef } from 'react'
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

// ── Vibración háptica corta (solo mobile) ─────────────────────
function haptic(ms = 40) {
  if (navigator?.vibrate) navigator.vibrate(ms)
}

export default function ProductModal() {
  const { selectedProduct: p, closeModal } = useModal()
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  // ── Swipe para cerrar ─────────────────────────────────────
  const panelRef    = useRef(null)
  const touchStartY = useRef(null)
  const [dragY, setDragY] = useState(0)

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchMove = (e) => {
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) setDragY(dy) // solo hacia abajo
  }

  const onTouchEnd = () => {
    if (dragY > 120) {
      haptic(30)
      closeModal()
    }
    setDragY(0)
  }

  useEffect(() => {
    if (!p) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [p, closeModal])

  useEffect(() => { setAdded(false); setDragY(0) }, [p])

  if (!p) return null

  const badge = getMaterialBadgeStyle(p.material)
  const effectivePrice = p.pricePromo ?? p.price

  const handleAdd = () => {
    haptic(60) // vibración corta al agregar
    addItem({ ...p, price: effectivePrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  // Opacidad del overlay va bajando con el drag
  const overlayOpacity = Math.max(0.2, 0.5 - dragY / 400)

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeModal}
        className="fixed inset-0 z-[70] backdrop-blur-sm"
        style={{
          backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
          animation: dragY > 0 ? 'none' : 'fadeIn 0.2s ease both',
        }}
      />

      {/* Panel — en mobile sube desde abajo como bottom sheet */}
      <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-4 pointer-events-none">
        <div
          ref={panelRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="relative w-full max-w-2xl bg-[#F9F5F2] shadow-2xl pointer-events-auto flex flex-col md:flex-row overflow-hidden md:max-h-[90vh]"
          style={{
            transform: `translateY(${dragY}px)`,
            transition: dragY === 0 ? 'transform 0.3s ease' : 'none',
            animation: dragY > 0 ? 'none' : 'modalIn 0.35s cubic-bezier(0.32,0.72,0,1) both',
            borderRadius: '12px 12px 0 0',
            maxHeight: '92vh',
          }}
        >
          {/* Handle de swipe — solo visible en mobile */}
          <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#d0c8c0]" />
          </div>

          {/* Botón cerrar — desktop */}
          <button onClick={closeModal}
            className="hidden md:flex absolute top-4 right-4 z-20 w-8 h-8 items-center justify-center text-[#7a7269] hover:text-[#0e0d0c] hover:bg-[#e8e2da] rounded-full transition-all duration-200 text-sm">
            ✕
          </button>

          {/* Imagen */}
          <div className="w-full md:w-2/5 flex-shrink-0 h-52 md:h-auto relative overflow-hidden bg-[#f0ece6]">
            <ModalImage image={p.image} emoji={p.emoji} name={p.name} />
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-6 md:p-7 flex flex-col gap-5">

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
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 768px) {
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  )
}
