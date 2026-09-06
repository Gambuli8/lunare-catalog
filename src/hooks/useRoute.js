import { useEffect, useState, useCallback } from 'react'

// Router mínimo sobre la History API.
//
// Usamos rutas reales (/producto/mini-silver) y no hash porque el hash
// no llega al servidor: Google y WhatsApp nunca verían la pieza.
// vercel.json se encarga de que cualquier ruta devuelva el index.

export function parsePath(pathname = window.location.pathname) {
  const seg = pathname.split('/').filter(Boolean)
  if (!seg.length) return { name: 'home' }
  if (seg[0] === 'producto' && seg[1]) return { name: 'product', slug: decodeURIComponent(seg[1]) }
  if (seg[0] === 'tienda') return { name: 'home', anchor: 'catalogo' }
  if (seg[0] === 'cuidados') return { name: 'home', anchor: 'cuidados' }
  if (seg[0] === 'cambios') return { name: 'home', anchor: 'politicas' }
  if (seg[0] === 'contacto') return { name: 'home', anchor: 'contacto' }
  return { name: 'notfound' }
}

export function navigate(to, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', to)
  else window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute() {
  const [route, setRoute] = useState(() => parsePath())

  const sync = useCallback(() => setRoute(parsePath()), [])

  useEffect(() => {
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [sync])

  // Los links internos son <a href> de verdad — para que el robot los siga
  // y para que se puedan abrir en otra pestaña — pero el clic común lo
  // resolvemos sin recargar.
  useEffect(() => {
    const onClick = e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return

      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      e.preventDefault()
      if (href !== window.location.pathname) navigate(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return route
}
