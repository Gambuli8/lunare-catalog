// ── Supabase ──────────────────────────────────────────────────
// Habla con la base con la service role key, que solo vive en el
// servidor. La clave nunca llega al navegador y las tablas tienen RLS
// sin políticas, así que las claves públicas no leen nada.
//
// Lo usan los pedidos y los arrepentimientos.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

const url = () => process.env.SUPABASE_URL
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY

export function supabaseConfigurado() {
  return Boolean(url() && key())
}

export async function rpc(fn, args) {
  const res = await fetch(`${url()}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key(),
      Authorization: `Bearer ${key()}`,
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10000),
  })
  const texto = await res.text()
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${texto.slice(0, 300)}`)
  return texto ? JSON.parse(texto) : null
}
