// ── CloudinaryImage ───────────────────────────────────────────
// Toma una URL de Cloudinary y aplica transformaciones automáticas.
//
// Props:
//   src       — URL original de Cloudinary (tal cual viene del Sheet)
//   alt       — texto alternativo
//   priority  — true para LCP/above-the-fold: fetchpriority=high, eager
//   className — clases adicionales para el <img>
//   fallback  — elemento JSX a mostrar si la imagen falla
//
// Transforma automáticamente:
//   Mobile  (<768px): f_auto, q_auto, w_500, c_limit
//   Desktop (≥768px): f_auto, q_auto, w_900, c_limit
//
// Ejemplo de URL transformada:
//   https://res.cloudinary.com/dtbasr3hw/image/upload/f_auto,q_auto,w_500,c_limit/v17.../foto.jpg

import { useState } from 'react'

// Extrae la parte después de /upload/ y le inyecta las transformaciones
function buildUrl(src, transforms) {
  if (!src || !src.includes('cloudinary.com')) return src
  return src.replace('/upload/', `/upload/${transforms}/`)
}

const MOBILE_T  = 'f_auto,q_auto,w_500,c_limit'
const DESKTOP_T = 'f_auto,q_auto,w_900,c_limit'

export default function CloudinaryImage({ src, alt = '', priority = false, className = '', fallback = null }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return fallback
  }

  const mobileSrc  = buildUrl(src, MOBILE_T)
  const desktopSrc = buildUrl(src, DESKTOP_T)

  return (
    <picture>
      {/* Desktop — ≥768px */}
      <source media="(min-width: 768px)" srcSet={desktopSrc} type="image/webp" />
      {/* Mobile — default */}
      <img
        src={mobileSrc}
        alt={alt}
        onError={() => setFailed(true)}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchpriority={priority ? 'high' : 'low'}
        className={className}
      />
    </picture>
  )
}
