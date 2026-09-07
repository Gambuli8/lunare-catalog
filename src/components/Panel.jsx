import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '../hooks/useProducts'
import Icon from './Icon'

// ── Panel de pedidos ──────────────────────────────────────────
// Hasta acá los pedidos solo se veían consultando la base. Esto es la
// pantalla para mirarlos y moverlos de estado.
//
// Pensado para el celular, que es desde donde se va a mirar: tarjetas y
// no una tabla, y los botones de estado a lo ancho.
//
// La sesión es una cookie httpOnly que deja /api/panel-login; acá nunca
// se guarda la clave.

const ESTADOS = {
  pendiente:  { etiqueta: 'Pendiente',  clase: 'bg-[#fdf4e3] text-[#8a6d1f] border-[#e8d9b0]' },
  pagado:     { etiqueta: 'Pagado',     clase: 'bg-[#eaf5ee] text-[#1c6b3c] border-[#bfdfcb]' },
  despachado: { etiqueta: 'Despachado', clase: 'bg-[#eef2fa] text-[#2f4b7d] border-[#c6d3e8]' },
  entregado:  { etiqueta: 'Entregado',  clase: 'bg-[#f0f0ee] text-[#4a463f] border-[#ddd9d1]' },
  cancelado:  { etiqueta: 'Cancelado',  clase: 'bg-[#fbeceb] text-[#9d3227] border-[#eccbc7]' },
}

const ESTADOS_ARR = {
  recibido:  { etiqueta: 'Recibido',  clase: 'bg-[#fdf4e3] text-[#8a6d1f] border-[#e8d9b0]' },
  en_curso:  { etiqueta: 'En curso',  clase: 'bg-[#eef2fa] text-[#2f4b7d] border-[#c6d3e8]' },
  resuelto:  { etiqueta: 'Resuelto',  clase: 'bg-[#eaf5ee] text-[#1c6b3c] border-[#bfdfcb]' },
  rechazado: { etiqueta: 'Rechazado', clase: 'bg-[#fbeceb] text-[#9d3227] border-[#eccbc7]' },
}

const ENTREGAS = {
  retiro_santa_rosa: 'Retira en Santa Rosa',
  retiro_cordoba: 'Retira en Nueva Córdoba',
  envio: 'Envío a domicilio',
}

const PAGOS = {
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo al retirar',
}

const fecha = iso => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// Mismo criterio que el mail: wa.me quiere el número sin 0, sin 15 y con
// el 54 9 adelante.
function waLink(telefono) {
  let d = String(telefono || '').replace(/\D/g, '')
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.startsWith('9')) d = d.slice(1)
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2')
  if (d.length < 8 || d.length > 12) return null
  return `https://wa.me/549${d}`
}

const miniatura = url =>
  url && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/f_auto,q_auto,w_120,h_120,c_fill,g_auto/')
    : url

function Etiqueta({ estado, mapa = ESTADOS }) {
  const e = mapa[estado] || { etiqueta: estado, clase: 'bg-line text-muted border-border' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[11px] tracking-wide uppercase border ${e.clase}`}>
      {e.etiqueta}
    </span>
  )
}

// ── Entrar ────────────────────────────────────────────────────

function Entrar({ onEntro }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [yendo, setYendo] = useState(false)

  const enviar = async e => {
    e.preventDefault()
    setYendo(true)
    setError('')
    try {
      const res = await fetch('/api/panel-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.ok) { setPassword(''); onEntro(); return }
      setError(data?.error === 'PANEL_NO_CONFIGURADO'
        ? 'El panel no está configurado todavía.'
        : 'Esa clave no es.')
    } catch {
      setError('No pudimos conectarnos. Probá de nuevo.')
    } finally {
      setYendo(false)
    }
  }

  return (
    <div className='flex items-center justify-center min-h-[70vh] px-6'>
      <form onSubmit={enviar} className='flex flex-col w-full max-w-sm gap-5'>
        <div className='text-center'>
          <span className='font-serif text-2xl tracking-[0.25em] text-dark'>LUNARE</span>
          <p className='text-[11px] tracking-[0.2em] uppercase text-gold mt-1'>Panel</p>
        </div>
        <label className='flex flex-col gap-1.5'>
          <span className='text-[13px] text-muted'>Clave</span>
          <input
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete='current-password'
            autoFocus
            className='h-11 px-3.5 text-sm bg-paper border border-border outline-none focus:border-gold transition-colors'
          />
        </label>
        {error && <p className='text-[13px] text-sale'>{error}</p>}
        <button
          type='submit'
          disabled={yendo || !password}
          className='h-12 text-xs tracking-[0.14em] uppercase transition-colors duration-300 border border-dark text-dark hover:bg-dark hover:text-cream disabled:opacity-40'
        >
          {yendo ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

// ── Un pedido ─────────────────────────────────────────────────

function Pedido({ pedido: p, onEstado, moviendo }) {
  const [abierto, setAbierto] = useState(false)
  const wa = waLink(p.telefono)
  const esEnvio = p.entrega === 'envio'

  return (
    <article className='border border-border bg-paper'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 border-b border-line'>
        <span className='font-serif text-[20px] tracking-wider text-gold'>{p.numero}</span>
        <Etiqueta estado={p.estado} />
        <span className='text-[12px] text-soft'>{fecha(p.creado_en)}</span>
        <span className='ml-auto text-[16px] text-dark'>{formatPrice(p.total)}</span>
      </div>

      <div className='px-4 py-3.5 flex flex-col gap-2.5'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
          <span className='text-[15px] text-dark'>{p.nombre}</span>
          {wa ? (
            <a
              href={wa}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-wa border border-wa/30 hover:bg-wa hover:text-white transition-colors'
            >
              {p.telefono}
            </a>
          ) : (
            <span className='text-[13px] text-muted'>{p.telefono}</span>
          )}
        </div>

        <p className='text-[13px] text-muted'>
          {ENTREGAS[p.entrega] || p.entrega} · {PAGOS[p.pago] || p.pago}
        </p>

        {esEnvio && (p.direccion || p.cp) && (
          <p className='text-[13px] text-muted'>
            {[p.direccion, p.cp && `CP ${p.cp}`].filter(Boolean).join(', ')}
          </p>
        )}

        {p.email && <p className='text-[13px] text-muted break-all'>{p.email}</p>}

        {p.notas && (
          <p className='text-[13px] text-muted px-3 py-2 bg-cream border-l-2 border-gold'>{p.notas}</p>
        )}

        <button
          onClick={() => setAbierto(a => !a)}
          className='flex items-center gap-1.5 self-start text-[12px] tracking-wide uppercase text-muted hover:text-gold transition-colors py-1'
        >
          {p.items.length} {p.items.length === 1 ? 'pieza' : 'piezas'}
          <Icon name='chevron' size={14} className={abierto ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>

        {abierto && (
          <ul className='flex flex-col gap-2.5 pt-1'>
            {p.items.map(i => (
              <li key={i.producto_id} className='flex items-center gap-3'>
                {i.imagen
                  ? <img src={miniatura(i.imagen)} alt='' width={44} height={44} loading='lazy' className='object-cover w-11 h-11' />
                  : <span className='w-11 h-11 bg-line' />}
                <div className='flex-1 min-w-0'>
                  <p className='text-[14px] text-dark truncate'>{i.nombre}</p>
                  <p className='text-[12px] text-soft'>{i.producto_id}{i.material ? ` · ${i.material}` : ''}</p>
                </div>
                <span className='text-[13px] text-muted whitespace-nowrap'>
                  {i.cantidad} × {formatPrice(i.precio_unitario)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {Number(p.costo_envio) > 0 && (
          <p className='text-[12px] text-soft'>
            Subtotal {formatPrice(p.subtotal)} + envío {formatPrice(p.costo_envio)}
          </p>
        )}
      </div>

      {/* "Marcar como" y no solo el nombre del estado: arriba hay una fila
          de filtros con las mismas palabras y se confunden. */}
      <div className='flex flex-wrap items-center gap-2 px-4 py-3 border-t border-line bg-cream'>
        <span className='text-[11px] tracking-[0.14em] uppercase text-soft w-full sm:w-auto'>Marcar como</span>
        {Object.keys(ESTADOS)
          .filter(e => e !== p.estado)
          .map(e => (
            <button
              key={e}
              disabled={moviendo}
              onClick={() => onEstado(p.id, e)}
              className='px-3 py-2 text-[12px] tracking-wide border border-border bg-paper text-muted hover:border-gold hover:text-gold transition-colors disabled:opacity-40'
            >
              {ESTADOS[e].etiqueta}
            </button>
          ))}
      </div>
    </article>
  )
}

// ── Un arrepentimiento ────────────────────────────────────────

function Arrepentido({ dato: a, onEstado, moviendo }) {
  const wa = waLink(a.telefono)
  return (
    <article className='border border-border bg-paper'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 border-b border-line'>
        <span className='font-serif text-[20px] tracking-wider text-gold'>{a.codigo}</span>
        <Etiqueta estado={a.estado} mapa={ESTADOS_ARR} />
        <span className='text-[12px] text-soft'>{fecha(a.creado_en)}</span>
      </div>

      <div className='px-4 py-3.5 flex flex-col gap-2.5'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
          <span className='text-[15px] text-dark'>{a.nombre}</span>
          {wa && (
            <a
              href={wa}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center px-2.5 py-1 text-[12px] text-wa border border-wa/30 hover:bg-wa hover:text-white transition-colors'
            >
              {a.telefono}
            </a>
          )}
        </div>
        <p className='text-[13px] text-muted break-all'>{a.email}</p>
        <p className='text-[13px] text-muted'>
          {a.pedido_numero
            ? <>Pedido {a.pedido_numero}{!a.pedido_encontrado && <span className='text-sale'> · no existe en la base</span>}</>
            : 'No indicó número de pedido'}
        </p>
        {a.detalle && (
          <p className='text-[13px] text-muted px-3 py-2 bg-cream border-l-2 border-gold'>{a.detalle}</p>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-2 px-4 py-3 border-t border-line bg-cream'>
        <span className='text-[11px] tracking-[0.14em] uppercase text-soft w-full sm:w-auto'>Marcar como</span>
        {Object.keys(ESTADOS_ARR)
          .filter(e => e !== a.estado)
          .map(e => (
            <button
              key={e}
              disabled={moviendo}
              onClick={() => onEstado(a.id, e)}
              className='px-3 py-2 text-[12px] tracking-wide border border-border bg-paper text-muted hover:border-gold hover:text-gold transition-colors disabled:opacity-40'
            >
              {ESTADOS_ARR[e].etiqueta}
            </button>
          ))}
      </div>
    </article>
  )
}

// ── El panel ──────────────────────────────────────────────────

export default function Panel() {
  const [sesion, setSesion] = useState(null) // null = todavía no sabemos
  const [vista, setVista] = useState('pedidos')
  const [filtro, setFiltro] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [arrepentimientos, setArrepentimientos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const [error, setError] = useState('')

  // El panel no se indexa. La ruta la sirve el index.html, así que no hay
  // un handler del servidor que ponga la meta.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    fetch('/api/panel-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'estado' }),
    })
      .then(r => r.json())
      .then(d => setSesion(Boolean(d?.sesion)))
      .catch(() => setSesion(false))
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const qs = vista === 'pedidos'
        ? `vista=pedidos${filtro ? `&estado=${filtro}` : ''}`
        : 'vista=arrepentimientos'

      const [rDatos, rResumen] = await Promise.all([
        fetch(`/api/panel?${qs}`),
        fetch('/api/panel?vista=resumen'),
      ])

      if (rDatos.status === 401) { setSesion(false); return }

      const datos = await rDatos.json()
      const res = await rResumen.json().catch(() => null)

      if (!datos?.ok) { setError('No pudimos traer los datos.'); return }
      if (vista === 'pedidos') setPedidos(datos.pedidos || [])
      else setArrepentimientos(datos.arrepentimientos || [])
      if (res?.ok) setResumen(res.resumen)
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setCargando(false)
    }
  }, [vista, filtro])

  useEffect(() => { if (sesion) cargar() }, [sesion, cargar])

  const cambiarEstado = async (id, estado, tipo = 'pedido') => {
    setMoviendo(true)
    setError('')
    try {
      const res = await fetch('/api/panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado, tipo }),
      })
      if (res.status === 401) { setSesion(false); return }
      const data = await res.json().catch(() => null)
      if (!data?.ok) { setError('No pudimos cambiar el estado.'); return }
      await cargar()
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setMoviendo(false)
    }
  }

  const salir = async () => {
    await fetch('/api/panel-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'salir' }),
    }).catch(() => {})
    setSesion(false)
  }

  if (sesion === null) {
    return <div className='py-32 text-center text-[13px] text-soft'>Cargando…</div>
  }
  if (!sesion) return <Entrar onEntro={() => setSesion(true)} />

  const porEstado = resumen?.por_estado || {}
  const lista = vista === 'pedidos' ? pedidos : arrepentimientos

  return (
    <section className='px-4 pt-6 pb-24 md:px-8'>
      <div className='max-w-3xl mx-auto'>
        <header className='flex flex-wrap items-center gap-3 mb-5'>
          <h1 className='font-serif text-[26px] font-light text-dark'>Pedidos</h1>
          <button
            onClick={cargar}
            disabled={cargando}
            className='px-3 py-1.5 text-[12px] tracking-wide uppercase border border-border text-muted hover:border-gold hover:text-gold transition-colors disabled:opacity-40'
          >
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button
            onClick={salir}
            className='ml-auto text-[12px] tracking-wide uppercase text-soft hover:text-gold transition-colors'
          >
            Salir
          </button>
        </header>

        {resumen && (
          <div className='flex flex-wrap gap-x-5 gap-y-2 px-4 py-3 mb-5 text-[13px] border border-border bg-paper'>
            <span className='text-muted'>
              Pendientes <b className='text-dark'>{porEstado.pendiente || 0}</b>
            </span>
            <span className='text-muted'>
              Pagados <b className='text-dark'>{porEstado.pagado || 0}</b>
            </span>
            <span className='text-muted'>
              Cobrado <b className='text-dark'>{formatPrice(resumen.vendido_pagado || 0)}</b>
            </span>
            {resumen.arrepentimientos_abiertos > 0 && (
              <span className='text-sale'>
                Arrepentimientos sin resolver <b>{resumen.arrepentimientos_abiertos}</b>
              </span>
            )}
          </div>
        )}

        <div className='flex gap-4 mb-4 border-b border-border'>
          {[['pedidos', 'Pedidos'], ['arrepentimientos', 'Arrepentimientos']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setVista(k)}
              className={`pb-2.5 text-[13px] tracking-wide transition-colors border-b-2 -mb-px ${
                vista === k ? 'border-gold text-dark' : 'border-transparent text-soft hover:text-muted'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {vista === 'pedidos' && (
          <div className='flex flex-wrap gap-2 mb-5'>
            {[['', 'Todos'], ...Object.entries(ESTADOS).map(([k, v]) => [k, v.etiqueta])].map(([k, l]) => (
              <button
                key={k || 'todos'}
                onClick={() => setFiltro(k)}
                className={`px-3 py-1.5 text-[12px] tracking-wide border transition-colors ${
                  filtro === k ? 'border-gold text-gold' : 'border-border text-muted hover:border-gold/50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {error && <p className='mb-4 text-[13px] text-sale'>{error}</p>}

        {lista.length === 0 && !cargando ? (
          <p className='py-16 text-center text-[14px] text-soft'>
            {vista === 'pedidos'
              ? (filtro ? 'No hay pedidos en ese estado.' : 'Todavía no entró ningún pedido.')
              : 'No hay arrepentimientos.'}
          </p>
        ) : (
          <div className='flex flex-col gap-4'>
            {vista === 'pedidos'
              ? pedidos.map(p => (
                  <Pedido key={p.id} pedido={p} moviendo={moviendo} onEstado={cambiarEstado} />
                ))
              : arrepentimientos.map(a => (
                  <Arrepentido
                    key={a.id}
                    dato={a}
                    moviendo={moviendo}
                    onEstado={(id, estado) => cambiarEstado(id, estado, 'arrepentimiento')}
                  />
                ))}
          </div>
        )}
      </div>
    </section>
  )
}
