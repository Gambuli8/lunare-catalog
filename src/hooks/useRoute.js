import { useEffect, useState, useCallback } from 'react'

// Router mínimo sobre la History API.
//
// Usamos rutas reales (/producto/mini-silver) y no hash porque el hash
// no llega al servidor: Google y WhatsApp nunca verían la pieza.
// vercel.json se encarga de que cualquier ruta devuelva el index.

export function parsePath(pathname = window.location.pathname, search = window.location.search) {
  const seg = pathname.split('/').filter(Boolean)
  const query = Object.fromEntries(new URLSearchParams(search))

  if (!seg.length) return { name: 'home', query }
  if (seg[0] === 'producto' && seg[1]) return { name: 'product', slug: decodeURIComponent(seg[1]), query }
  if (seg[0] === 'tienda') return { name: 'shop', categorySlug: seg[1] ? decodeURIComponent(seg[1]) : null, query }
  // Cada una es su propia página, no un ancla de la home: si sirvieran el
  // HTML de la home, las tres tendrían el mismo canonical y Google las
  // trataría como duplicados. Además están en el sitemap.
  if (seg[0] === 'cuidados') return { name: 'care', query }
  if (seg[0] === 'cambios') return { name: 'policy', query }
  if (seg[0] === 'contacto') return { name: 'contact', query }
  return { name: 'notfound', query }
}

export function navigate(to, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', to)
  else window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// Arma una dirección de tienda con los filtros puestos, para que una
// vista filtrada se pueda compartir y volver a abrir igual.
export function shopUrl({ categorySlug = null, material = '', orden = '', q = '' } = {}) {
  const path = categorySlug ? `/tienda/${categorySlug}` : '/tienda'
  const params = new URLSearchParams()
  if (material) params.set('material', material)
  if (orden && orden !== 'destacados') params.set('orden', orden)
  if (q) params.set('q', q)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
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
      if (href !== window.location.pathname + window.location.search) navigate(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return route
}
