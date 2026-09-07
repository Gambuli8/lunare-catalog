import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En producción Vercel resuelve /api/* y las reescrituras de vercel.json.
// Vite no hace ninguna de las dos, así que acá replicamos lo mismo para
// que `npm run dev` se comporte igual y no haga falta la CLI de Vercel.
function apiDevServer() {
  return {
    name: 'lunare-api-dev',
    apply: 'serve',
    configureServer(server) {
      // Mismas reescrituras que vercel.json
      const rewrites = [
        { test: /^\/producto\/([^/?]+)\/?$/, file: 'page', param: 'slug' },
        { test: /^\/tienda\/([^/?]+)\/?$/, file: 'shop', param: 'cat' },
        { test: /^\/tienda\/?$/, file: 'shop' },
        { test: /^\/(cuidados|cambios|contacto|arrepentimiento)\/?$/, file: 'pagina', param: 'pagina' },
        { test: /^\/sitemap\.xml$/, file: 'sitemap' },
      ]

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        let file = null
        const query = Object.fromEntries(url.searchParams)

        const apiMatch = url.pathname.match(/^\/api\/([a-z0-9-]+)$/i)
        if (apiMatch) {
          file = apiMatch[1]
        } else {
          for (const r of rewrites) {
            const m = url.pathname.match(r.test)
            if (m) {
              file = r.file
              if (r.param) query[r.param] = decodeURIComponent(m[1])
              break
            }
          }
        }
        if (!file) return next()

        // Shim mínimo de la API de respuesta que espera el handler de Vercel
        res.status = code => { res.statusCode = code; return res }
        res.json = body => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        }
        res.send = body => {
          if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(body)
        }
        req.query = query

        // Vercel parsea el cuerpo JSON solo; Vite no, asi que lo hacemos
        // aca para que los POST se comporten igual en dev.
        if (req.method === 'POST' || req.method === 'PUT') {
          req.body = await new Promise(resolve => {
            let crudo = ''
            req.on('data', c => { crudo += c })
            req.on('end', () => {
              try { resolve(crudo ? JSON.parse(crudo) : {}) } catch { resolve(crudo) }
            })
          })
        }

        try {
          const mod = await server.ssrLoadModule(`/api/${file}.js`)
          await mod.default(req, res)
        } catch (err) {
          server.config.logger.error(`[api/${file}] ${err.stack || err}`)
          res.status(500).json({ error: 'Error en el handler local' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv con prefijo '' lee también las variables sin VITE_. Las pasamos a
  // process.env para los handlers; no entran en `define`, así que no se
  // filtran al bundle del cliente.
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'SHEET_CSV_URL', 'SITE_URL',
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY', 'AVISO_EMAIL_DESTINO', 'AVISO_EMAIL_FROM',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }

  return { plugins: [react(), apiDevServer()] }
})
