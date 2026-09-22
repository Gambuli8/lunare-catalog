// ── Por dónde se contacta la clienta ──────────────────────────
// El número estaba escrito en tres archivos y en dos formatos —con y sin
// el https://wa.me/ adelante—, así que cambiarlo era buscarlo. Acá una
// sola vez.
//
// El del servidor va aparte, en api/_aviso.js: los mails no pueden
// importar de src/.

export const WHATSAPP = '542954476558'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP}`

export const INSTAGRAM_USUARIO = 'lunare.acc'
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_USUARIO}`

// Dónde se retira, escrito igual en todos lados. "Nueva Córdoba" es un
// barrio, así que lleva la provincia: desde afuera no se ubica.
export const RETIROS = 'Santa Rosa (La Pampa) y Nueva Córdoba (Córdoba)'
