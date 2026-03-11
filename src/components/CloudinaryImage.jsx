// ── CloudinaryImage ───────────────────────────────────────────

import { useState } from 'react'

function buildUrl(src, transforms) {
  if (!src || !src.includes('cloudinary.com')) return src
  return src.replace('/upload/', `/upload/${transforms}/`)
}

// OPTIMIZACIÓN: g_auto deja que Cloudinary detecte el punto de interés (la joya)
// dpr_2 garantiza nitidez en pantallas retina
// Las cards usan c_fill para rellenar el contenedor sin deformar
const MOBILE_T = 'f_auto,q_auto:best,w_600,dpr_2,c_fill,g_auto'
const DESKTOP_T = 'f_auto,q_auto:best,w_900,dpr_2,c_fill,g_auto'
// Modal: sin crop forzado, se muestra la foto completa con padding si es necesario
const MODAL_T = 'f_auto,q_auto:best,w_900,dpr_2,c_limit'

export default function CloudinaryImage({ src, alt = '', priority = false, className = '', fallback = null, modal = false }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return fallback
  }

  // En el modal usamos c_limit (foto completa sin crop)
  // En cards usamos c_fill,g_auto (rellena el contenedor con crop inteligente)
  const mobileSrc = buildUrl(src, modal ? MODAL_T : MOBILE_T)
  const desktopSrc = buildUrl(src, modal ? MODAL_T : DESKTOP_T)

  return (
    <picture>
      {/* Desktop — ≥768px */}
      <source
        media='(min-width: 768px)'
        srcSet={desktopSrc}
        type='image/webp'
      />
      {/* Mobile — default */}
      <img
        src={mobileSrc}
        alt={alt}
        onError={() => setFailed(true)}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchpriority={priority ? 'high' : 'low'}
        className={className}
        // Agregamos object-cover por defecto por si el contenedor varía
        style={{ objectFit: 'cover' }}
      />
    </picture>
  )
}
