import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En producción Vercel sirve solo /api/products.js. Vite no lo hace, así que
// en `npm run dev` montamos el mismo handler como middleware para no obligar
// a instalar la CLI de Vercel.
function apiDevServer() {
  return {
    name: 'lunare-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/products', async (req, res) => {
        // Shim mínimo de la API de respuesta que espera el handler de Vercel
        res.status = code => { res.statusCode = code; return res }
        res.json = body => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        }
        try {
          const { default: handler } = await server.ssrLoadModule('/api/products.js')
          await handler(req, res)
        } catch (err) {
          server.config.logger.error(`[api/products] ${err.stack || err}`)
          res.status(500).json({ error: 'Error en el handler local' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv con prefijo '' lee también las variables sin VITE_. La pasamos a
  // process.env para el handler; no entra en `define`, así que no se filtra
  // al bundle del cliente.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.SHEET_CSV_URL) process.env.SHEET_CSV_URL = env.SHEET_CSV_URL

  return { plugins: [react(), apiDevServer()] }
})
