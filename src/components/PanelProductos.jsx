import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../hooks/useProducts'
import Icon from './Icon'

// ── Productos en el panel ─────────────────────────────────────
// Donde la dueña maneja el catálogo: lo que antes era la planilla.
// Pensado para el celular, igual que los pedidos: tarjetas, botones
// grandes y la ficha de edición a pantalla completa.

const DE_A_PARES = ['Argolla', 'Pasante', 'Abridor']

const ERRORES = {
  CODIGO_INVALIDO: 'El código solo puede tener letras, números y / - _ . (hasta 30).',
  CODIGO_REPETIDO: 'Ya hay una pieza con ese código.',
  NOMBRE_REQUERIDO: 'Falta el nombre.',
  CATEGORIA_INVALIDA: 'Elegí una categoría.',
  MATERIAL_INVALIDO: 'Elegí un material.',
  PRECIO_INVALIDO: 'Revisá los precios: tienen que ser números enteros.',
  PROMO_NO_ES_MENOR: 'El precio promo tiene que ser menor al precio normal.',
  STOCK_INVALIDO: 'El stock tiene que ser un número entero, 0 o más.',
  STOCK_NEGATIVO: 'Mientras editabas se vendieron piezas y el stock quedaría negativo. Volvé a abrir la ficha.',
  FOTO_INVALIDA: 'Alguna foto no es un link https válido.',
  DEMASIADAS_FOTOS: 'Hasta 12 fotos por pieza.',
  NO_EXISTE: 'Esa pieza ya no existe. Actualizá la lista.',
  EN_PEDIDOS: 'Esta pieza está en pedidos, así que no se puede borrar. Podés ocultarla: deja de verse en la tienda pero queda en los pedidos.',
  FALTA_STOCK_ANTERIOR: 'Actualizá la lista y probá de nuevo.',
}

const mensaje = data => {
  if (data?.errores?.length) return [...new Set(data.errores.map(e => ERRORES[e.codigo] || e.codigo))].join(' ')
  return ERRORES[data?.error] || 'No pudimos guardar. Probá de nuevo.'
}

const miniatura = url =>
  url && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/f_auto,q_auto,w_160,h_160,c_fill,g_center/')
    : url

const VACIO = {
  id: '', nombre: '', categoria: '', subcategoria: '', material: '',
  precio: '', precio_promo: '', precio_conjunto: '', precio_costo: '',
  stock: 1, fotos: [], foto_conjunto: '', descripcion: '',
  destacado: false, publicado: true,
}

async function llamar(cuerpo) {
  const res = await fetch('/api/panel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}

// Sube un archivo directo a Cloudinary con la firma que da el servidor.
async function subirFoto(archivo) {
  const { status, data: f } = await llamar({ tipo: 'firma_foto' })
  if (status === 401) throw Object.assign(new Error('sesion'), { sesion: true })
  if (!f?.ok) throw new Error('No se pueden subir fotos todavía: falta configurar Cloudinary.')

  const form = new FormData()
  form.append('file', archivo)
  form.append('api_key', f.api_key)
  form.append('timestamp', f.timestamp)
  form.append('signature', f.signature)
  form.append('folder', f.folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${f.cloud}/image/upload`, { method: 'POST', body: form })
  const r = await res.json().catch(() => null)
  if (!res.ok || !r?.secure_url) throw new Error('Cloudinary no aceptó la foto. Probá con otra.')
  return r.secure_url
}

// ── Campos ────────────────────────────────────────────────────

const claseInput = 'h-11 px-3 text-[14px] bg-paper border border-border outline-none focus:border-gold transition-colors w-full'

function Campo({ etiqueta, ayuda, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className='text-[12px] tracking-wide text-muted'>{etiqueta}</span>
      {children}
      {ayuda && <span className='text-[12px] leading-snug text-soft'>{ayuda}</span>}
    </label>
  )
}

function Fotos({ fotos, onCambiar, subidaActiva, onSesion }) {
  const [link, setLink] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const mover = (i, d) => {
    const n = [...fotos]
    const j = i + d
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    onCambiar(n)
  }

  const agregarLink = () => {
    const url = link.trim()
    if (!/^https:\/\//.test(url)) { setError('El link tiene que empezar con https://'); return }
    setError('')
    onCambiar([...fotos, url])
    setLink('')
  }

  const subir = async e => {
    const archivos = [...(e.target.files || [])]
    e.target.value = ''
    if (!archivos.length) return
    setSubiendo(true)
    setError('')
    const nuevas = []
    try {
      for (const a of archivos) nuevas.push(await subirFoto(a))
    } catch (err) {
      if (err.sesion) { onSesion(); return }
      setError(err.message)
    } finally {
      if (nuevas.length) onCambiar([...fotos, ...nuevas])
      setSubiendo(false)
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      {fotos.length > 0 && (
        <ul className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
          {fotos.map((url, i) => (
            <li key={url} className='relative border border-border bg-cream'>
              <img src={miniatura(url)} alt='' className='object-cover w-full aspect-square' loading='lazy' />
              {i === 0 && (
                <span className='absolute top-1 left-1 px-1.5 py-0.5 text-[10px] tracking-wide uppercase bg-dark text-cream'>Principal</span>
              )}
              <div className='flex border-t border-border'>
                <button type='button' onClick={() => mover(i, -1)} disabled={i === 0} aria-label='Mover a la izquierda'
                  className='flex-1 h-9 text-[13px] text-muted hover:text-gold disabled:opacity-30'>‹</button>
                <button type='button' onClick={() => onCambiar(fotos.filter((_, k) => k !== i))} aria-label='Sacar foto'
                  className='flex-1 h-9 text-[13px] text-sale border-x border-border'>✕</button>
                <button type='button' onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} aria-label='Mover a la derecha'
                  className='flex-1 h-9 text-[13px] text-muted hover:text-gold disabled:opacity-30'>›</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {subidaActiva && (
        <label className={`flex items-center justify-center h-11 text-[12px] tracking-[0.12em] uppercase border border-dashed border-gold text-gold cursor-pointer hover:bg-gold/5 ${subiendo ? 'opacity-50 pointer-events-none' : ''}`}>
          {subiendo ? 'Subiendo…' : 'Subir fotos desde el celular o la compu'}
          <input type='file' accept='image/*' multiple onChange={subir} className='sr-only' />
        </label>
      )}

      <div className='flex gap-2'>
        <input
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder='O pegá el link de una foto'
          className={claseInput}
        />
        <button type='button' onClick={agregarLink} disabled={!link.trim()}
          className='px-4 text-[12px] tracking-wide uppercase border border-dark text-dark hover:bg-dark hover:text-cream disabled:opacity-40'>
          Agregar
        </button>
      </div>
      {error && <p className='text-[13px] text-sale'>{error}</p>}
    </div>
  )
}

// ── La ficha de edición ───────────────────────────────────────

function Ficha({ inicial, nuevo, categorias, materiales, subidaActiva, onCerrar, onGuardado, onSesion }) {
  const [p, setP] = useState(() => ({ ...VACIO, ...inicial }))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setP(x => ({ ...x, [k]: v }))
  const dePar = DE_A_PARES.includes(p.categoria)

  const guardar = async e => {
    e?.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const { status, data } = await llamar({
        tipo: 'producto',
        nuevo,
        producto: p,
        stock_anterior: nuevo ? null : inicial.stock,
      })
      if (status === 401) { onSesion(); return }
      if (!data?.ok) { setError(mensaje(data)); return }
      onGuardado(data.producto)
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async () => {
    if (!window.confirm(`¿Borrar "${p.nombre}"? No se puede deshacer.`)) return
    setGuardando(true)
    setError('')
    try {
      const { status, data } = await llamar({ tipo: 'borrar_producto', id: inicial.id })
      if (status === 401) { onSesion(); return }
      if (!data?.ok) { setError(mensaje(data)); return }
      onGuardado(null)
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setGuardando(false)
    }
  }

  // Bloquear el scroll de atrás mientras la ficha está abierta.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto bg-cream'>
      <form onSubmit={guardar} className='max-w-2xl px-4 pt-5 pb-32 mx-auto md:px-8'>
        <header className='flex items-center gap-3 mb-6'>
          <button type='button' onClick={onCerrar} className='flex items-center gap-1 text-[12px] tracking-wide uppercase text-muted hover:text-gold'>
            <Icon name='flecha' size={14} className='rotate-180' /> Volver
          </button>
          <h2 className='font-serif text-[24px] font-light text-dark ml-2 truncate'>
            {nuevo ? 'Pieza nueva' : p.nombre || 'Editar'}
          </h2>
        </header>

        <div className='flex flex-col gap-6'>
          <section className='flex flex-col gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Campo etiqueta='Nombre'>
                <input value={p.nombre} onChange={e => set('nombre', e.target.value)} className={claseInput} placeholder='Basic Silver' />
              </Campo>
              <Campo etiqueta='Código' ayuda={nuevo ? 'El que usás para identificarla. Después no se cambia.' : 'No se puede cambiar.'}>
                <input value={p.id} onChange={e => set('id', e.target.value)} disabled={!nuevo}
                  className={`${claseInput} disabled:opacity-60`} placeholder='Aro1742' />
              </Campo>
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <Campo etiqueta='Categoría'>
                <select value={p.categoria} onChange={e => set('categoria', e.target.value)} className={claseInput}>
                  <option value=''>Elegí…</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo etiqueta='Medida o detalle' ayuda='Se ve abajo del nombre.'>
                <input value={p.subcategoria} onChange={e => set('subcategoria', e.target.value)} className={claseInput} placeholder='Argolla 9mm' />
              </Campo>
              <Campo etiqueta='Material'>
                <select value={p.material} onChange={e => set('material', e.target.value)} className={claseInput}>
                  <option value=''>Elegí…</option>
                  {materiales.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Campo>
            </div>
          </section>

          <section className='grid gap-4 p-4 border sm:grid-cols-2 border-border bg-paper'>
            <Campo etiqueta={dePar ? 'Precio del par' : 'Precio'} ayuda={dePar ? 'Los aritos se venden siempre de a par.' : undefined}>
              <input inputMode='numeric' value={p.precio} onChange={e => set('precio', e.target.value)} className={claseInput} placeholder='4700' />
            </Campo>
            <Campo etiqueta='Precio promo' ayuda='Opcional. Se muestra tachado el normal.'>
              <input inputMode='numeric' value={p.precio_promo ?? ''} onChange={e => set('precio_promo', e.target.value)} className={claseInput} />
            </Campo>
            <Campo etiqueta='Precio costo' ayuda='Solo lo ves vos. No sale nunca en la tienda.'>
              <input inputMode='numeric' value={p.precio_costo ?? ''} onChange={e => set('precio_costo', e.target.value)} className={claseInput} />
            </Campo>
            <Campo etiqueta='Stock' ayuda='Cuántas hay para vender. Con 0 deja de verse en la tienda.'>
              <div className='flex'>
                <button type='button' onClick={() => set('stock', Math.max(0, (Number(p.stock) || 0) - 1))}
                  className='w-11 h-11 border border-border text-[18px] text-muted hover:text-gold'>−</button>
                <input inputMode='numeric' value={p.stock} onChange={e => set('stock', e.target.value)}
                  className={`${claseInput} text-center border-x-0`} />
                <button type='button' onClick={() => set('stock', (Number(p.stock) || 0) + 1)}
                  className='w-11 h-11 border border-border text-[18px] text-muted hover:text-gold'>+</button>
              </div>
            </Campo>
          </section>

          <section className='flex flex-col gap-3'>
            <span className='text-[12px] tracking-wide text-muted'>Fotos — la primera es la que se ve en la tienda</span>
            <Fotos fotos={p.fotos} onCambiar={f => set('fotos', f)} subidaActiva={subidaActiva} onSesion={onSesion} />
          </section>

          <Campo etiqueta='Descripción' ayuda='Opcional, pero ayuda a que la encuentren en Google.'>
            <textarea rows={4} value={p.descripcion} onChange={e => set('descripcion', e.target.value)}
              className='px-3 py-2.5 text-[14px] bg-paper border border-border outline-none focus:border-gold transition-colors resize-y' />
          </Campo>

          <details className='border border-border bg-paper' open={Boolean(p.precio_conjunto)}>
            <summary className='px-4 py-3 text-[13px] text-muted cursor-pointer'>Conjunto con dije (solo cadenas)</summary>
            <div className='grid gap-4 px-4 pb-4 sm:grid-cols-2'>
              <Campo etiqueta='Precio de la cadena en conjunto' ayuda='Si lo cargás, esta cadena se ofrece con los dijes a este precio.'>
                <input inputMode='numeric' value={p.precio_conjunto ?? ''} onChange={e => set('precio_conjunto', e.target.value)} className={claseInput} />
              </Campo>
              <Campo etiqueta='Foto del conjunto (link)' ayuda='Opcional: la cadena con el dije puesto.'>
                <input value={p.foto_conjunto} onChange={e => set('foto_conjunto', e.target.value)} className={claseInput} placeholder='https://…' />
              </Campo>
            </div>
          </details>

          <section className='flex flex-col gap-3'>
            <label className='flex items-center gap-3 text-[14px] text-dark'>
              <input type='checkbox' checked={p.publicado} onChange={e => set('publicado', e.target.checked)} className='w-5 h-5 accent-[#8f7647]' />
              Visible en la tienda
            </label>
            <label className='flex items-center gap-3 text-[14px] text-dark'>
              <input type='checkbox' checked={p.destacado} onChange={e => set('destacado', e.target.checked)} className='w-5 h-5 accent-[#8f7647]' />
              Destacada en la portada
            </label>
          </section>

          {!nuevo && inicial.slug && (
            <a href={`/producto/${inicial.slug}`} target='_blank' rel='noopener noreferrer' className='self-start text-[13px] underline text-muted hover:text-gold'>
              Ver la ficha en la tienda
            </a>
          )}
        </div>

        <div className='fixed inset-x-0 bottom-0 border-t border-border bg-cream/95 backdrop-blur'>
          <div className='flex flex-col max-w-2xl gap-2 px-4 py-3 mx-auto md:px-8'>
            {error && <p className='text-[13px] text-sale'>{error}</p>}
            <div className='flex gap-2'>
              {!nuevo && (
                <button type='button' onClick={borrar} disabled={guardando}
                  className='h-12 px-4 text-[12px] tracking-wide uppercase border border-sale/40 text-sale hover:bg-sale hover:text-white disabled:opacity-40'>
                  Borrar
                </button>
              )}
              <button type='submit' disabled={guardando}
                className='flex-1 h-12 text-xs tracking-[0.14em] uppercase bg-dark text-cream hover:bg-[#2e2a26] disabled:opacity-40'>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Una fila de la lista ──────────────────────────────────────

function Fila({ p, onAbrir, onStock, ocupado }) {
  const precio = p.precio_promo && p.precio_promo < p.precio ? p.precio_promo : p.precio
  return (
    <article className='flex items-center gap-3 p-3 border border-border bg-paper'>
      <button onClick={onAbrir} className='flex items-center flex-1 min-w-0 gap-3 text-left'>
        {p.fotos?.[0]
          ? <img src={miniatura(p.fotos[0])} alt='' width={56} height={56} loading='lazy' className='object-cover w-14 h-14 shrink-0' />
          : <span className='w-14 h-14 bg-line shrink-0' />}
        <span className='flex flex-col min-w-0 gap-0.5'>
          <span className='text-[15px] text-dark truncate'>{p.nombre}</span>
          <span className='text-[12px] text-soft truncate'>{p.id} · {p.subcategoria || p.categoria} · {p.material}</span>
          <span className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted'>
            {formatPrice(precio)}
            {precio !== p.precio && <s className='text-soft'>{formatPrice(p.precio)}</s>}
            {!p.publicado && <span className='px-1.5 text-[10px] tracking-wide uppercase border border-border text-soft'>Oculta</span>}
            {p.publicado && p.stock === 0 && <span className='px-1.5 text-[10px] tracking-wide uppercase border border-sale/40 text-sale'>Sin stock</span>}
            {p.destacado && <span className='px-1.5 text-[10px] tracking-wide uppercase border border-gold/50 text-gold'>Destacada</span>}
          </span>
        </span>
      </button>

      <div className='flex flex-col items-center shrink-0'>
        <span className='text-[10px] tracking-wide uppercase text-soft'>Stock</span>
        <div className='flex items-center'>
          <button onClick={() => onStock(p, -1)} disabled={ocupado || p.stock === 0} aria-label='Restar uno'
            className='w-10 h-10 text-[18px] text-muted hover:text-gold disabled:opacity-30'>−</button>
          <span className='w-7 text-center text-[16px] text-dark'>{p.stock}</span>
          <button onClick={() => onStock(p, 1)} disabled={ocupado} aria-label='Sumar uno'
            className='w-10 h-10 text-[18px] text-muted hover:text-gold disabled:opacity-30'>+</button>
        </div>
      </div>
    </article>
  )
}

// ── La pestaña ────────────────────────────────────────────────

const FILTROS = [
  ['todas', 'Todas'],
  ['en_venta', 'En venta'],
  ['sin_stock', 'Sin stock'],
  ['ocultas', 'Ocultas'],
]

export default function PanelProductos({ onSinSesion }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [abierta, setAbierta] = useState(null) // { producto, nuevo }
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/panel?vista=productos')
      if (res.status === 401) { onSinSesion(); return }
      const d = await res.json().catch(() => null)
      if (!d?.ok) { setError('No pudimos traer los productos.'); return }
      setDatos(d)
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setCargando(false)
    }
  }, [onSinSesion])

  useEffect(() => { cargar() }, [cargar])

  const productos = datos?.productos || []

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(p => {
      if (categoria && p.categoria !== categoria) return false
      if (filtro === 'en_venta' && !(p.publicado && p.stock > 0)) return false
      if (filtro === 'sin_stock' && p.stock !== 0) return false
      if (filtro === 'ocultas' && p.publicado) return false
      if (!q) return true
      return `${p.nombre} ${p.id} ${p.subcategoria}`.toLowerCase().includes(q)
    })
  }, [productos, busqueda, categoria, filtro])

  const enVenta = productos.filter(p => p.publicado && p.stock > 0).length

  // El + y − de la lista: guarda la pieza entera con el stock cambiado,
  // y el servidor aplica solo la diferencia.
  const cambiarStock = async (p, delta) => {
    setOcupado(true)
    setError('')
    try {
      const { status, data } = await llamar({
        tipo: 'producto',
        producto: { ...p, stock: p.stock + delta },
        stock_anterior: p.stock,
      })
      if (status === 401) { onSinSesion(); return }
      if (!data?.ok) { setError(mensaje(data)); return }
      setDatos(d => ({ ...d, productos: d.productos.map(x => (x.id === p.id ? data.producto : x)) }))
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setOcupado(false)
    }
  }

  const importar = async () => {
    setOcupado(true)
    setError('')
    setAviso('')
    try {
      const { status, data } = await llamar({ tipo: 'importar_planilla' })
      if (status === 401) { onSinSesion(); return }
      if (!data?.ok) { setError('No pudimos leer la planilla.'); return }
      const partes = [data.insertados
        ? `Listo: se cargaron ${data.insertados} piezas de la planilla${data.existentes ? ` (${data.existentes} ya estaban y no se tocaron)` : ''}.`
        : 'No había piezas nuevas en la planilla: todas ya estaban cargadas.']

      // Dos piezas distintas con el mismo código: entra una sola, y la
      // otra hay que cargarla a mano con un código nuevo.
      const afuera = (data.repetidos || []).filter(r => r.quedaron_afuera?.length)
      if (afuera.length) {
        partes.push('Ojo, en la planilla había códigos repetidos con piezas distintas. Entró una sola por código; cargá las otras con "+ Nueva pieza" y un código nuevo: ' +
          afuera.map(r => `${r.id} (entró "${r.entro}", quedó afuera "${r.quedaron_afuera.join('", "')}")`).join('; ') + '.')
      }
      if (data.errores?.length) {
        partes.push(`No entraron ${data.errores.length} filas por datos inválidos: ${data.errores.map(e => e.id).join(', ')}.`)
      }
      setAviso(partes.join(' '))
      await cargar()
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setOcupado(false)
    }
  }

  const alGuardar = () => {
    setAbierta(null)
    setAviso('Guardado. La tienda lo muestra en uno o dos minutos.')
    cargar()
  }

  if (!datos) {
    return (
      <p className='py-16 text-center text-[14px] text-soft'>
        {error || 'Cargando productos…'}
      </p>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[13px] border border-border bg-paper'>
        <span className='text-muted'>Piezas <b className='text-dark'>{productos.length}</b></span>
        <span className='text-muted'>En venta <b className='text-dark'>{enVenta}</b></span>
        <button
          onClick={() => setAbierta({ producto: { ...VACIO }, nuevo: true })}
          className='ml-auto px-4 py-2 text-[12px] tracking-[0.12em] uppercase bg-dark text-cream hover:bg-[#2e2a26]'
        >
          + Nueva pieza
        </button>
      </div>

      {productos.length === 0 && datos.planilla_configurada && (
        <div className='flex flex-col gap-3 p-4 border border-gold/50 bg-paper'>
          <p className='text-[14px] text-dark'>Todavía no hay piezas cargadas en el panel.</p>
          <p className='text-[13px] text-muted'>
            Traé todo lo que está en la planilla de una vez: nombres, precios, stock y fotos. Después de eso, el catálogo se maneja solo desde acá.
          </p>
          <button onClick={importar} disabled={ocupado}
            className='self-start h-11 px-5 text-[12px] tracking-[0.12em] uppercase border border-dark text-dark hover:bg-dark hover:text-cream disabled:opacity-40'>
            {ocupado ? 'Importando…' : 'Importar desde la planilla'}
          </button>
        </div>
      )}

      <div className='flex flex-col gap-2 sm:flex-row'>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder='Buscar por nombre o código'
          className={claseInput}
        />
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className={`${claseInput} sm:w-48`}>
          <option value=''>Todas las categorías</option>
          {datos.categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className='flex flex-wrap gap-2'>
        {FILTROS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFiltro(k)}
            className={`px-3 py-1.5 text-[12px] tracking-wide border transition-colors ${
              filtro === k ? 'border-gold text-gold' : 'border-border text-muted hover:border-gold/50'
            }`}
          >
            {l}
          </button>
        ))}
        <button onClick={cargar} disabled={cargando}
          className='ml-auto px-3 py-1.5 text-[12px] tracking-wide uppercase border border-border text-muted hover:border-gold hover:text-gold disabled:opacity-40'>
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {aviso && <p className='text-[13px] text-[#1c6b3c]'>{aviso}</p>}
      {error && <p className='text-[13px] text-sale'>{error}</p>}

      {visibles.length === 0 ? (
        <p className='py-12 text-center text-[14px] text-soft'>
          {productos.length ? 'No hay piezas con ese filtro.' : 'Todavía no hay piezas.'}
        </p>
      ) : (
        <div className='flex flex-col gap-2'>
          {visibles.map(p => (
            <Fila key={p.id} p={p} ocupado={ocupado}
              onAbrir={() => setAbierta({ producto: p, nuevo: false })}
              onStock={cambiarStock} />
          ))}
        </div>
      )}

      {productos.length > 0 && datos.planilla_configurada && (
        <button onClick={importar} disabled={ocupado}
          className='self-center mt-4 text-[12px] underline text-soft hover:text-gold disabled:opacity-40'>
          Traer de la planilla las piezas que falten
        </button>
      )}

      {abierta && (
        <Ficha
          inicial={abierta.producto}
          nuevo={abierta.nuevo}
          categorias={datos.categorias}
          materiales={datos.materiales}
          subidaActiva={datos.fotos_configuradas}
          onCerrar={() => setAbierta(null)}
          onGuardado={alGuardar}
          onSesion={onSinSesion}
        />
      )}
    </div>
  )
}
