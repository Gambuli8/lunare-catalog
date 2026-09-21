// ── CloudinaryImage ───────────────────────────────────────────

import { useState } from 'react'

function buildUrl(src, transforms) {
  if (!src || !src.includes('cloudinary.com')) return src
  return src.replace('/upload/', `/upload/${transforms}/`)
}

// Las tarjetas recortan al cuadrado con c_fill, y g_center decide qué parte
// se queda: el centro.
//
// Antes era g_auto, que le deja a Cloudinary elegir el punto de interés.
// Comparado contra cuatro fotos del catálogo, g_auto erraba siempre igual:
// se quedaba con la parte de arriba --la tela y la veta de la madera-- y
// dejaba la joya abajo, pegada al borde. Son piezas chicas sobre un fondo
// con textura, y el detector se va al fondo.
//
// La foto se saca con la pieza al centro, así que el centro es el mejor
// lugar donde mirar. dpr_2 mantiene la nitidez en pantallas retina.
const MOBILE_T = 'f_auto,q_auto:best,w_600,dpr_2,c_fill,g_center'
const DESKTOP_T = 'f_auto,q_auto:best,w_900,dpr_2,c_fill,g_center'
// Modal: sin crop forzado, se muestra la foto completa con padding si es necesario
const MODAL_T = 'f_auto,q_auto:best,w_900,dpr_2,c_limit'

export default function CloudinaryImage({ src, alt = '', priority = false, className = '', fallback = null, modal = false }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return fallback
  }

  // En el modal usamos c_limit (foto completa sin crop)
  // En cards usamos c_fill,g_center (rellena el contenedor recortando
  // desde el centro, que es donde está la pieza)
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
