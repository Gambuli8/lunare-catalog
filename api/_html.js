// ── Utilidades de HTML para las páginas prerenderizadas ───────
// Las comparten api/page.js (ficha) y api/shop.js (categorías).
// Los archivos de api/ que empiezan con "_" no son endpoints.

export const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Pedimos el index.html del propio deploy para heredar los hashes de los
// assets del build actual, en vez de tener que adivinarlos.
export async function loadShell(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host || '')
  const proto = req.headers['x-forwarded-proto'] || (local ? 'http' : 'https')
  return fetch(`${proto}://${host}/index.html`, { signal: AbortSignal.timeout(8000) })
    .then(r => r.text())
}

// Saca las etiquetas genéricas del index.html para que no queden
// duplicadas con las de la página.
export function stripHeadTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
}

export function inject(shell, tags) {
  return stripHeadTags(shell).replace('</head>', '    ' + tags.join('\n    ') + '\n  </head>')
}

export function notFound(res, shell, title) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(404).send(inject(shell, [
    '<meta name="robots" content="noindex,follow">',
    `<title>${esc(title)}</title>`,
  ]))
}
