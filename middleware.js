import { next } from '@vercel/functions'

// ── Modo mantenimiento ────────────────────────────────────────
// Corre antes que todo lo demás —páginas, assets y /api—, así que
// mientras está prendido nadie ve el catálogo ni puede pegarle a la API.
//
// Se prende y se apaga desde Vercel, sin tocar código:
//   MANTENIMIENTO=1                 → cortina puesta
//   MANTENIMIENTO=0 (o sin definir) → tienda abierta
//   MANTENIMIENTO_PASSWORD=...      → la clave para entrar igual
//
// Para entrar vos: https://www.lunareacc.com/?clave=LA_CLAVE
// Queda una cookie de 7 días y podés navegar normal.
//
// ⚠️ Esto es una cortina, no seguridad: sirve para que una clienta no vea
// el sitio a medio hacer. Quien tenga la clave entra, y la primera vez
// viaja en la URL (queda en el historial del navegador y en los logs).
// No lo uses para proteger nada sensible.

const COOKIE = 'lunare_acceso'
const DIAS = 7

const activo = () => process.env.MANTENIMIENTO === '1'
const clave = () => process.env.MANTENIMIENTO_PASSWORD || ''

// El token de la cookie es un hash de la clave, para no dejarla en texto
// plano en el navegador.
async function token(valor) {
  const datos = new TextEncoder().encode(`lunare:${valor}`)
  const hash = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// Comparación de tiempo constante: evita filtrar la clave midiendo cuánto
// tarda en fallar.
function igual(a, b) {
  if (a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return dif === 0
}

function leerCookie(request, nombre) {
  const crudo = request.headers.get('cookie') || ''
  for (const parte of crudo.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nombre) return v.join('=')
  }
  return null
}

function paginaMantenimiento() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Volvemos pronto · Lunare Accesorios</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@300;400;500&display=swap">
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:#F9F5F2;color:#0e0d0c;
       font-family:'Jost',Futura,'Century Gothic',sans-serif;
       display:flex;align-items:center;justify-content:center;padding:32px;
       -webkit-font-smoothing:antialiased}
  .caja{max-width:520px;width:100%;text-align:center;
        animation:entra .8s cubic-bezier(.16,1,.3,1) both}
  .marca{display:flex;flex-direction:column;align-items:center;line-height:1;margin-bottom:40px}
  .marca b{font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;letter-spacing:.12em}
  .marca i{font-style:normal;font-size:9px;letter-spacing:.34em;text-transform:uppercase;color:#8f7647;margin-top:6px}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;
     font-size:clamp(34px,7vw,46px);line-height:1.1;margin:0 0 18px}
  h1 em{font-style:italic;color:#8f7647}
  p{margin:0 auto;max-width:400px;font-size:16px;line-height:1.65;color:#5f574e}
  .linea{width:44px;height:1px;background:#e8e2da;margin:32px auto}
  .contacto{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px}
  .contacto a{display:inline-flex;align-items:center;gap:9px;text-decoration:none;
              font-size:13px;letter-spacing:.1em;text-transform:uppercase;
              padding:14px 22px;border:1px solid #e8e2da;background:#fff;color:#0e0d0c;
              transition:border-color .25s ease,transform .25s ease}
  .contacto a:hover{border-color:#8f7647;transform:translateY(-2px)}
  .contacto a.wa{background:#0f7a41;border-color:#0f7a41;color:#fff}
  .contacto a.wa:hover{background:#0c6836;border-color:#0c6836}
  @keyframes entra{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @media(prefers-reduced-motion:reduce){.caja{animation:none}}
</style>
</head>
<body>
  <div class="caja">
    <div class="marca"><b>Lunare</b><i>Accesorios</i></div>
    <h1>Estamos preparando<br><em>algo nuevo</em></h1>
    <p>La tienda vuelve en unos días, renovada. Mientras tanto seguimos atendiendo por WhatsApp y por Instagram, como siempre.</p>
    <div class="linea"></div>
    <div class="contacto">
      <a class="wa" href="https://wa.me/542954476558">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.03 1.02-1.03 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.34M12.05 21.8h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.22-3.74.99 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26C2.16 6.45 6.6 2.02 12.05 2.02c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.8 11.8 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z"/></svg>
        Escribinos
      </a>
      <a href="https://instagram.com/lunare.acc">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>
        @lunare.acc
      </a>
    </div>
  </div>
</body>
</html>`
}

// Rutas que la cortina no puede tapar: no las pide una persona, las
// llama un servicio que no tiene cómo mandar la clave.
//
// Mercado Pago avisa acá que un pago se aprobó. Con la cortina puesta le
// devolvíamos 503, reintentaba un rato y se rendía: el pedido se quedaba
// en "pendiente" para siempre aunque la clienta hubiera pagado.
//
// El endpoint no es una puerta abierta: verifica la firma HMAC de cada
// notificación y sin ella no toca nada.
const SIEMPRE_ABIERTAS = ['/api/mp-webhook']

export default async function middleware(request) {
  if (!activo()) return next()

  const pass = clave()
  const url = new URL(request.url)

  if (SIEMPRE_ABIERTAS.includes(url.pathname)) return next()

  // Sin clave configurada la cortina igual se pone: es preferible a dejar
  // la tienda abierta por un descuido de configuración.
  if (pass) {
    const esperado = await token(pass)

    // Entrada con ?clave=... — deja la cookie y limpia la URL.
    const enviada = url.searchParams.get('clave')
    if (enviada && igual(enviada, pass)) {
      url.searchParams.delete('clave')
      return new Response(null, {
        status: 302,
        headers: {
          Location: url.pathname + (url.search || '') || '/',
          'Set-Cookie': `${COOKIE}=${esperado}; Path=/; Max-Age=${DIAS * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const cookie = leerCookie(request, COOKIE)
    if (cookie && igual(cookie, esperado)) return next()
  }

  // 503 y no 404: le dice a Google que es temporal y que no desindexe.
  return new Response(paginaMantenimiento(), {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
      'Retry-After': '86400',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
