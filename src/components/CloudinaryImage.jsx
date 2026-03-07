// ── CloudinaryImage ───────────────────────────────────────────

import { useState } from 'react'

function buildUrl(src, transforms) {
  if (!src || !src.includes('cloudinary.com')) return src
  return src.replace('/upload/', `/upload/${transforms}/`)
}

// OPTIMIZACIÓN: Bajamos el ancho base a 400px (ideal para grillas de 2 columnas)
// y agregamos dpr_auto para que Cloudinary ajuste la nitidez según la pantalla del celular.
const MOBILE_T = 'f_auto,q_auto,w_400,dpr_auto,c_limit'
const DESKTOP_T = 'f_auto,q_auto,w_800,dpr_auto,c_limit' // Ajustado a 800px para web

export default function CloudinaryImage({ src, alt = '', priority = false, className = '', fallback = null }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return fallback
  }

  const mobileSrc = buildUrl(src, MOBILE_T)
  const desktopSrc = buildUrl(src, DESKTOP_T)

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
