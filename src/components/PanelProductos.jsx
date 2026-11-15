import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../hooks/useProducts'
import Icon from './Icon'

// ── Productos en el panel ─────────────────────────────────────
// Donde la dueña maneja el catálogo: lo que antes era la planilla.
//
// Dos formas según la pantalla:
//   - Celular: grilla de fotos de a dos, con el stock a mano en cada
//     tarjeta, y la ficha en una hoja que sube desde abajo. Es donde se
//     carga y se repone, y la foto grande es lo que ayuda a encontrar
//     la pieza.
//   - Compu (lg, 1024 px o más): una planilla. Precio, promo, stock y
//     visible se cambian ahí mismo y se guardan solos; la ficha completa
//     se abre en un panel a la derecha. Es para corregir de a muchas.

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

const foto = (url, w = 480) =>
  url && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${w},h_${w},c_fill,g_center/`)
    : url

const VACIO = {
  id: '', nombre: '', categoria: '', subcategoria: '', material: '',
  precio: '', precio_promo: '', precio_conjunto: '', precio_costo: '',
  stock: 1, fotos: [], foto_conjunto: '', descripcion: '',
  destacado: false, publicado: true,
}

const ESTADOS = [
  ['en_venta', 'En venta'],
  ['sin_stock', 'Sin stock'],
  ['ocultas', 'Ocultas'],
  ['todas', 'Todas'],
]

const enVenta = p => p.publicado && p.stock > 0
const precioFinal = p => (p.precio_promo && p.precio_promo < p.precio ? p.precio_promo : p.precio)

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
  if (!f?.ok) throw new Error('No se pueden subir fotos todavía: falta configurar Cloudinary. Mientras tanto podés pegar el link de una foto.')

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

// ¿Pantalla de compu? Con 1024 px o más va la planilla.
function useEsCompu() {
  const consulta = '(min-width: 1024px)'
  const [es, setEs] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches)
  useEffect(() => {
    const m = window.matchMedia(consulta)
    const cambio = () => setEs(m.matches)
    m.addEventListener('change', cambio)
    return () => m.removeEventListener('change', cambio)
  }, [])
  return es
}

// ── Piezas chicas ─────────────────────────────────────────────

const claseInput = 'h-11 px-3.5 text-[15px] bg-paper border border-border outline-none focus:border-gold transition-colors w-full'

function Campo({ etiqueta, ayuda, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className='text-[12px] text-muted'>{etiqueta}</span>
      {children}
      {ayuda && <span className='text-[12px] leading-snug text-muted'>{ayuda}</span>}
    </label>
  )
}

function Interruptor({ prendido, onCambiar, etiqueta, disabled }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={prendido}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={() => onCambiar(!prendido)}
      className={`relative w-11 h-[26px] rounded-full transition-colors shrink-0 disabled:opacity-40 ${prendido ? 'bg-wa' : 'bg-[#d9d2c8]'}`}
    >
      <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all ${prendido ? 'left-[21px]' : 'left-[3px]'}`} />
    </button>
  )
}

function Contador({ valor, onCambiar, disabled, chico = false }) {
  const alto = chico ? 'h-9' : 'h-11'
  const ancho = chico ? 'w-9' : 'w-11'
  return (
    <div className='flex items-center border border-border bg-paper'>
      <button type='button' aria-label='Restar uno' disabled={disabled || valor <= 0}
        onClick={() => onCambiar(Math.max(0, valor - 1))}
        className={`${ancho} ${alto} text-[18px] text-muted hover:text-gold disabled:opacity-30`}>−</button>
      <span className={`min-w-[32px] text-center ${chico ? 'text-[14px]' : 'text-[17px]'} ${valor === 0 ? 'text-sale' : 'text-dark'}`}>{valor}</span>
      <button type='button' aria-label='Sumar uno' disabled={disabled}
        onClick={() => onCambiar(valor + 1)}
        className={`${ancho} ${alto} text-[18px] text-muted hover:text-gold disabled:opacity-30`}>+</button>
    </div>
  )
}

function Etiqueta({ p }) {
  if (!p.publicado) return <span className='px-2 py-0.5 text-[11px] bg-[#f0f0ee] text-[#4a463f]'>Oculta</span>
  if (p.stock === 0) return <span className='px-2 py-0.5 text-[11px] bg-sale text-white'>Sin stock</span>
  return <span className='px-2 py-0.5 text-[11px] bg-white/95 text-wa'>En venta</span>
}

// ── Fotos de la ficha ─────────────────────────────────────────

function Fotos({ fotos, onCambiar, subidaActiva, onSesion }) {
  const [link, setLink] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const hacerPrincipal = i => onCambiar([fotos[i], ...fotos.filter((_, k) => k !== i)])
  const sacar = i => onCambiar(fotos.filter((_, k) => k !== i))

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

  const [principal, ...resto] = fotos

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex gap-2'>
        {principal ? (
          <div className='relative w-[150px] shrink-0'>
            <img src={foto(principal, 300)} alt='Foto principal' className='object-cover w-[150px] h-[150px]' />
            <span className='absolute left-1.5 bottom-1.5 px-1.5 py-0.5 text-[10px] tracking-[0.12em] uppercase bg-dark text-cream'>Portada</span>
            <button type='button' onClick={() => sacar(0)} aria-label='Sacar la foto principal'
              className='absolute flex items-center justify-center w-8 h-8 top-1 right-1 bg-white/90 text-sale'>✕</button>
          </div>
        ) : (
          <div className='flex items-center justify-center w-[150px] h-[150px] shrink-0 bg-line text-[12px] text-muted text-center px-3'>
            Todavía no tiene fotos
          </div>
        )}

        <div className='grid content-start flex-1 grid-cols-2 gap-2'>
          {resto.map((url, k) => (
            <div key={url} className='relative'>
              {/* Tocar una foto chica la pone de portada. */}
              <button type='button' onClick={() => hacerPrincipal(k + 1)} aria-label={`Poner la foto ${k + 2} de portada`} className='block w-full'>
                <img src={foto(url, 200)} alt='' className='object-cover w-full h-[71px]' />
              </button>
              <button type='button' onClick={() => sacar(k + 1)} aria-label={`Sacar la foto ${k + 2}`}
                className='absolute top-0 right-0 flex items-center justify-center w-8 h-8 bg-white/90 text-sale'>✕</button>
            </div>
          ))}
          <label className={`col-span-2 flex items-center justify-center gap-1.5 h-[71px] border border-dashed border-gold bg-paper text-gold text-[12px] tracking-[0.1em] uppercase text-center px-2 ${subidaActiva ? 'cursor-pointer hover:bg-gold/5' : 'opacity-60'} ${subiendo ? 'opacity-50 pointer-events-none' : ''}`}>
            {subiendo ? 'Subiendo…' : subidaActiva ? 'Sacar o subir foto' : 'Subir fotos: falta configurar'}
            {subidaActiva && <input type='file' accept='image/*' multiple onChange={subir} className='sr-only' />}
          </label>
        </div>
      </div>

      {resto.length > 0 && (
        <p className='text-[12px] text-muted'>Tocá una foto chica para ponerla de portada.</p>
      )}

      <div className='flex gap-2'>
        <input value={link} onChange={e => setLink(e.target.value)} placeholder='O pegá el link de una foto' className={claseInput} />
        <button type='button' onClick={agregarLink} disabled={!link.trim()}
          className='px-4 text-[12px] tracking-wide uppercase border border-dark text-dark hover:bg-dark hover:text-cream disabled:opacity-40'>
          Agregar
        </button>
      </div>
      {error && <p className='text-[13px] text-sale'>{error}</p>}
    </div>
  )
}

// ── La ficha ──────────────────────────────────────────────────
// En el celular, una hoja que sube desde abajo; en la compu, un panel a
// la derecha. Arriba va lo que más se toca; el resto, en "Más datos".

function Ficha({ inicial, nuevo, categorias, materiales, subidaActiva, esCompu, onCerrar, onGuardado, onSesion }) {
  const [p, setP] = useState(() => ({ ...VACIO, ...inicial }))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  // Una pieza nueva necesita código, categoría y material: arranca abierto.
  const [masDatos, setMasDatos] = useState(nuevo)
  const set = (k, v) => setP(x => ({ ...x, [k]: v }))
  const dePar = DE_A_PARES.includes(p.categoria)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = e => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc) }
  }, [onCerrar])

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
      if (!data?.ok) {
        setError(mensaje(data))
        if (data?.errores?.some(x => ['id', 'categoria', 'material', 'precio_costo', 'descripcion'].includes(x.campo))) setMasDatos(true)
        return
      }
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

  const caja = esCompu
    ? 'right-0 top-0 h-full w-[480px] border-l border-border'
    : 'inset-x-0 bottom-0 h-[92vh] rounded-t-[14px]'

  return (
    <div className='fixed inset-0 z-50'>
      <button aria-label='Cerrar' onClick={onCerrar} className='absolute inset-0 w-full h-full cursor-default bg-dark/45' />
      <form
        onSubmit={guardar}
        role='dialog'
        aria-modal='true'
        aria-label={nuevo ? 'Pieza nueva' : `Editar ${p.nombre}`}
        className={`absolute flex flex-col bg-cream shadow-2xl ${caja}`}
      >
        {!esCompu && (
          <div className='flex justify-center pt-2.5'>
            <span className='w-10 h-1 rounded-full bg-border' />
          </div>
        )}

        <header className='flex items-center justify-between gap-3 px-5 pt-1.5 pb-3 border-b border-line'>
          <button type='button' onClick={onCerrar} className='h-11 text-[14px] text-muted'>Cancelar</button>
          <h2 className='font-serif text-[24px] font-normal truncate text-dark'>{nuevo ? 'Pieza nueva' : p.nombre || 'Editar'}</h2>
          <button type='submit' disabled={guardando} className='h-11 text-[14px] font-medium text-gold disabled:opacity-40'>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </header>

        <div className='flex flex-col flex-1 gap-5 px-5 py-5 overflow-y-auto'>
          {error && <p className='px-3 py-2 text-[13px] text-sale bg-[#fbeceb] border border-[#eccbc7]'>{error}</p>}

          <Fotos fotos={p.fotos} onCambiar={f => set('fotos', f)} subidaActiva={subidaActiva} onSesion={onSesion} />

          <Campo etiqueta='Nombre'>
            <input value={p.nombre} onChange={e => set('nombre', e.target.value)} className={claseInput} placeholder='Basic Silver' />
          </Campo>

          <div className='grid grid-cols-2 gap-3'>
            <Campo etiqueta={dePar ? 'Precio del par' : 'Precio'}>
              <input inputMode='numeric' value={p.precio} onChange={e => set('precio', e.target.value)} className={claseInput} placeholder='4700' />
            </Campo>
            <Campo etiqueta='Precio promo'>
              <input inputMode='numeric' value={p.precio_promo ?? ''} onChange={e => set('precio_promo', e.target.value)} className={claseInput} placeholder='Sin promo' />
            </Campo>
          </div>

          <div className='flex items-center justify-between gap-3 px-3.5 py-3 border bg-paper border-border'>
            <span className='flex flex-col'>
              <span className='text-[15px] text-dark'>Stock</span>
              <span className='text-[12px] text-muted'>Con 0 deja de verse en la tienda</span>
            </span>
            <Contador valor={Number(p.stock) || 0} onCambiar={v => set('stock', v)} />
          </div>

          <div className='flex flex-col border bg-paper border-border'>
            <div className='flex items-center justify-between px-3.5 h-[52px] border-b border-line'>
              <span className='text-[15px] text-dark'>Visible en la tienda</span>
              <Interruptor prendido={p.publicado} onCambiar={v => set('publicado', v)} etiqueta='Visible en la tienda' />
            </div>
            <div className='flex items-center justify-between px-3.5 h-[52px]'>
              <span className='text-[15px] text-dark'>Destacada en la portada</span>
              <Interruptor prendido={p.destacado} onCambiar={v => set('destacado', v)} etiqueta='Destacada en la portada' />
            </div>
          </div>

          <div className='border bg-paper border-border'>
            <button type='button' onClick={() => setMasDatos(m => !m)} aria-expanded={masDatos}
              className='flex items-center justify-between w-full gap-3 px-3.5 py-3 text-left'>
              <span className='flex flex-col'>
                <span className='text-[15px] text-dark'>Más datos</span>
                <span className='text-[12px] text-muted'>Código, categoría, material, medida, costo, descripción</span>
              </span>
              <Icon name='chevron' size={16} className={`text-muted transition-transform ${masDatos ? 'rotate-180' : ''}`} />
            </button>

            {masDatos && (
              <div className='flex flex-col gap-4 px-3.5 pb-4'>
                <div className='grid grid-cols-2 gap-3'>
                  <Campo etiqueta='Código' ayuda={nuevo ? 'Después no se cambia.' : 'No se puede cambiar.'}>
                    <input value={p.id} onChange={e => set('id', e.target.value)} disabled={!nuevo}
                      className={`${claseInput} disabled:opacity-60`} placeholder='Aro1742' />
                  </Campo>
                  <Campo etiqueta='Material'>
                    <select value={p.material} onChange={e => set('material', e.target.value)} className={claseInput}>
                      <option value=''>Elegí…</option>
                      {materiales.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta='Categoría'>
                    <select value={p.categoria} onChange={e => set('categoria', e.target.value)} className={claseInput}>
                      <option value=''>Elegí…</option>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta='Medida o detalle'>
                    <input value={p.subcategoria} onChange={e => set('subcategoria', e.target.value)} className={claseInput} placeholder='Argolla 9mm' />
                  </Campo>
                </div>

                <Campo etiqueta='Precio costo' ayuda='Solo lo ves vos. No sale nunca en la tienda.'>
                  <input inputMode='numeric' value={p.precio_costo ?? ''} onChange={e => set('precio_costo', e.target.value)} className={claseInput} />
                </Campo>

                <Campo etiqueta='Descripción' ayuda='Opcional, pero ayuda a que la encuentren en Google.'>
                  <textarea rows={4} value={p.descripcion} onChange={e => set('descripcion', e.target.value)}
                    className='px-3.5 py-2.5 text-[15px] bg-paper border border-border outline-none focus:border-gold transition-colors resize-y' />
                </Campo>

                <div className='grid grid-cols-2 gap-3'>
                  <Campo etiqueta='Precio en conjunto' ayuda='Solo cadenas: el precio cuando va con un dije.'>
                    <input inputMode='numeric' value={p.precio_conjunto ?? ''} onChange={e => set('precio_conjunto', e.target.value)} className={claseInput} />
                  </Campo>
                  <Campo etiqueta='Foto del conjunto' ayuda='Link de la cadena con el dije puesto.'>
                    <input value={p.foto_conjunto} onChange={e => set('foto_conjunto', e.target.value)} className={claseInput} placeholder='https://…' />
                  </Campo>
                </div>

                {!nuevo && inicial.slug && (
                  <a href={`/producto/${inicial.slug}`} target='_blank' rel='noopener noreferrer'
                    className='self-start text-[13px] underline text-muted hover:text-gold'>
                    Ver la ficha en la tienda
                  </a>
                )}

                {!nuevo && (
                  <button type='button' onClick={borrar} disabled={guardando}
                    className='self-start h-11 px-4 text-[12px] tracking-wide uppercase border border-sale/40 text-sale hover:bg-sale hover:text-white disabled:opacity-40'>
                    Borrar la pieza
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Celular: la tarjeta ───────────────────────────────────────

function Tarjeta({ p, onAbrir, onCambios, ocupado }) {
  const final = precioFinal(p)
  return (
    <article className='flex flex-col border bg-paper border-border'>
      <button onClick={onAbrir} className='flex flex-col text-left' aria-label={`Editar ${p.nombre}`}>
        <span className='relative block'>
          {p.fotos?.[0]
            ? <img src={foto(p.fotos[0])} alt='' loading='lazy' className='block object-cover w-full aspect-square' />
            : <span className='block w-full aspect-square bg-line' />}
          <span className='absolute top-2 left-2'><Etiqueta p={p} /></span>
          {final !== p.precio && (
            <span className='absolute top-2 right-2 px-1.5 py-0.5 text-[10px] tracking-[0.12em] uppercase bg-gold text-white'>Promo</span>
          )}
        </span>
        <span className='flex flex-col gap-0.5 px-2.5 pt-2.5 pb-1'>
          <span className='text-[14px] truncate text-dark'>{p.nombre}</span>
          <span className='text-[12px] truncate text-muted'>{[p.subcategoria || p.categoria, p.material].filter(Boolean).join(' · ')}</span>
          <span className='text-[14px] text-dark mt-0.5'>
            {formatPrice(final)}
            {final !== p.precio && <s className='ml-1.5 text-[12px] text-muted'>{formatPrice(p.precio)}</s>}
          </span>
        </span>
      </button>
      <div className='flex items-center mt-1.5 border-t border-line'>
        <button aria-label='Restar uno' disabled={ocupado || p.stock === 0}
          onClick={() => onCambios({ stock: p.stock - 1 })}
          className='w-11 h-11 text-[18px] text-muted disabled:opacity-30'>−</button>
        <span className='flex-1 text-center text-[13px] text-muted'>
          Stock <b className={`font-medium ${p.stock === 0 ? 'text-sale' : 'text-dark'}`}>{p.stock}</b>
        </span>
        <button aria-label='Sumar uno' disabled={ocupado}
          onClick={() => onCambios({ stock: p.stock + 1 })}
          className='w-11 h-11 text-[18px] text-muted disabled:opacity-30'>+</button>
      </div>
    </article>
  )
}

// ── Compu: una celda de precio que se edita ahí mismo ─────────
// Guarda al salir de la celda o con Enter; Escape la deja como estaba.

function CeldaPrecio({ valor, onGuardar, vacio = '—', ocupado, etiqueta }) {
  const [texto, setTexto] = useState(valor ?? '')
  const [editando, setEditando] = useState(false)
  useEffect(() => { if (!editando) setTexto(valor ?? '') }, [valor, editando])

  // Se lee lo que dice la celda en ese momento y no el estado: si el
  // último tecleo todavía no se procesó, el estado tiene el valor viejo.
  const terminar = escrito => {
    setEditando(false)
    const limpio = String(escrito).replace(/[^\d]/g, '')
    const nuevo = limpio === '' ? null : Number(limpio)
    if (nuevo !== (valor ?? null)) onGuardar(nuevo)
  }

  if (!editando) {
    return (
      <button type='button' disabled={ocupado} onClick={() => setEditando(true)} aria-label={`Cambiar ${etiqueta}`}
        className='w-full h-9 px-2 -ml-2 text-left text-[14px] hover:bg-cream hover:outline hover:outline-1 hover:outline-border disabled:opacity-50'>
        {valor ? formatPrice(valor) : <span className='text-muted'>{vacio}</span>}
      </button>
    )
  }
  return (
    <input
      autoFocus
      inputMode='numeric'
      aria-label={etiqueta}
      value={texto}
      onChange={e => setTexto(e.target.value)}
      onBlur={e => terminar(e.currentTarget.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setTexto(valor ?? ''); setEditando(false) }
      }}
      className='w-[92px] h-9 px-2 -ml-2 text-[14px] bg-paper border border-gold outline-none'
    />
  )
}

const COLUMNAS = 'grid grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_112px_112px_124px_72px_44px] items-center gap-x-2'

function FilaPlanilla({ p, onAbrir, onCambios, ocupado }) {
  return (
    <div className={`${COLUMNAS} min-h-[60px] px-3 border-t border-line hover:bg-[#fdfbf8]`}>
      {p.fotos?.[0]
        ? <img src={foto(p.fotos[0], 96)} alt='' loading='lazy' className='object-cover w-11 h-11' />
        : <span className='w-11 h-11 bg-line' />}
      <button onClick={onAbrir} className='flex flex-col min-w-0 text-left'>
        <span className='text-[14px] truncate text-dark hover:text-gold'>{p.nombre}</span>
        <span className='text-[12px] text-muted'>{p.id}{!p.publicado ? ' · oculta' : ''}</span>
      </button>
      <span className='text-[13px] truncate text-muted'>{p.subcategoria || p.categoria}</span>
      <span className='text-[13px] truncate text-muted'>{p.material}</span>
      <CeldaPrecio valor={p.precio} etiqueta={`precio de ${p.nombre}`} ocupado={ocupado}
        onGuardar={v => onCambios({ precio: v })} />
      <CeldaPrecio valor={p.precio_promo} etiqueta={`promo de ${p.nombre}`} ocupado={ocupado}
        onGuardar={v => onCambios({ precio_promo: v })} />
      <Contador chico valor={p.stock} disabled={ocupado} onCambiar={v => onCambios({ stock: v })} />
      <Interruptor prendido={p.publicado} disabled={ocupado} etiqueta={`${p.nombre} visible en la tienda`}
        onCambiar={v => onCambios({ publicado: v })} />
      <button onClick={onAbrir} aria-label={`Abrir la ficha de ${p.nombre}`}
        className='flex items-center justify-center w-11 h-11 text-muted hover:text-gold'>
        <Icon name='flecha' size={15} />
      </button>
    </div>
  )
}

// ── La pestaña ────────────────────────────────────────────────

export default function PanelProductos({ onSinSesion }) {
  const esCompu = useEsCompu()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [material, setMaterial] = useState('')
  const [estado, setEstado] = useState('en_venta')
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
      // Sin piezas en venta (recién importado o todo agotado) no tiene
      // sentido arrancar mostrando una lista vacía.
      if (d.productos?.length && !d.productos.some(enVenta)) setEstado('todas')
    } catch {
      setError('No pudimos conectarnos.')
    } finally {
      setCargando(false)
    }
  }, [onSinSesion])

  useEffect(() => { cargar() }, [cargar])

  const productos = datos?.productos || []

  const porCategoria = useMemo(() => {
    const n = {}
    for (const p of productos) n[p.categoria] = (n[p.categoria] || 0) + 1
    return n
  }, [productos])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(p => {
      if (categoria && p.categoria !== categoria) return false
      if (material && p.material !== material) return false
      if (estado === 'en_venta' && !enVenta(p)) return false
      if (estado === 'sin_stock' && !(p.publicado && p.stock === 0)) return false
      if (estado === 'ocultas' && p.publicado) return false
      if (!q) return true
      return `${p.nombre} ${p.id} ${p.subcategoria}`.toLowerCase().includes(q)
    })
  }, [productos, busqueda, categoria, material, estado])

  const cuentaEnVenta = productos.filter(enVenta).length

  // Un cambio desde la lista o la planilla (stock, precio, promo,
  // visible): se manda la pieza entera con el cambio, y el servidor aplica
  // la diferencia de stock.
  const cambiar = async (p, cambios) => {
    setOcupado(true)
    setError('')
    setAviso('')
    try {
      const { status, data } = await llamar({
        tipo: 'producto',
        producto: { ...p, ...cambios },
        stock_anterior: p.stock,
      })
      if (status === 401) { onSinSesion(); return }
      if (!data?.ok) { setError(`${p.nombre}: ${mensaje(data)}`); return }
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
        partes.push('Ojo, en la planilla había códigos repetidos con piezas distintas. Entró una sola por código; cargá las otras con "Nueva pieza" y un código nuevo: ' +
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

  const cerrarFicha = useCallback(() => setAbierta(null), [])

  const alGuardar = () => {
    setAbierta(null)
    setAviso('Guardado. La tienda lo muestra en uno o dos minutos.')
    cargar()
  }

  const nueva = () => setAbierta({ producto: { ...VACIO }, nuevo: true })

  if (!datos) {
    return <p className='py-16 text-center text-[14px] text-muted'>{error || 'Cargando productos…'}</p>
  }

  const segmentos = (
    <div className='flex p-[3px] bg-line'>
      {ESTADOS.map(([k, l]) => (
        <button key={k} onClick={() => setEstado(k)}
          className={`flex-1 h-[38px] px-3 text-[13px] whitespace-nowrap transition-colors ${
            estado === k ? 'bg-paper text-dark shadow-[0_1px_2px_rgba(14,13,12,0.08)]' : 'text-muted hover:text-dark'
          }`}>
          {l}
        </button>
      ))}
    </div>
  )

  const buscador = (
    <label className='flex items-center gap-2.5 h-11 px-3.5 border bg-paper border-border lg:w-[320px]'>
      <Icon name='buscar' size={16} className='text-muted' />
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label='Buscar'
        placeholder='Buscar por nombre o código'
        className='flex-1 min-w-0 text-[14px] bg-transparent outline-none' />
    </label>
  )

  return (
    <div className='flex flex-col gap-3.5'>
      <div className='flex items-baseline gap-3'>
        <h1 className='font-serif text-[30px] lg:text-[34px] font-normal text-dark'>Productos</h1>
        <span className='text-[13px] text-muted'>{cuentaEnVenta} en venta · {productos.length} en total</span>
        {esCompu && (
          <button onClick={nueva}
            className='self-center ml-auto h-11 px-5 text-[12px] tracking-[0.14em] uppercase bg-dark text-cream hover:bg-[#2e2a26]'>
            + Nueva pieza
          </button>
        )}
      </div>

      {productos.length === 0 && datos.planilla_configurada && (
        <div className='flex flex-col gap-3 p-4 border border-gold/50 bg-paper'>
          <p className='text-[15px] text-dark'>Todavía no hay piezas cargadas en el panel.</p>
          <p className='text-[13px] text-muted'>
            Traé todo lo que está en la planilla de una vez: nombres, precios, stock y fotos. Después de eso, el catálogo se maneja solo desde acá.
          </p>
          <button onClick={importar} disabled={ocupado}
            className='self-start h-11 px-5 text-[12px] tracking-[0.12em] uppercase border border-dark text-dark hover:bg-dark hover:text-cream disabled:opacity-40'>
            {ocupado ? 'Importando…' : 'Importar desde la planilla'}
          </button>
        </div>
      )}

      {esCompu ? (
        <div className='flex flex-wrap items-center gap-2.5'>
          {buscador}
          <select value={categoria} onChange={e => setCategoria(e.target.value)} aria-label='Categoría'
            className='h-11 px-3 text-[14px] border bg-paper border-border'>
            <option value=''>Todas las categorías</option>
            {datos.categorias.filter(c => porCategoria[c]).map(c => <option key={c} value={c}>{c} ({porCategoria[c]})</option>)}
          </select>
          <select value={material} onChange={e => setMaterial(e.target.value)} aria-label='Material'
            className='h-11 px-3 text-[14px] border bg-paper border-border'>
            <option value=''>Todos los materiales</option>
            {datos.materiales.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className='ml-auto'>{segmentos}</div>
        </div>
      ) : (
        <>
          {buscador}
          <div className='flex gap-2 -mx-5 px-5 overflow-x-auto [scrollbar-width:none]'>
            {[['', 'Todas', productos.length], ...datos.categorias.filter(c => porCategoria[c]).map(c => [c, c, porCategoria[c]])].map(([k, l, n]) => (
              <button key={k || 'todas'} onClick={() => setCategoria(k)}
                className={`h-9 px-3.5 text-[13px] whitespace-nowrap border shrink-0 transition-colors ${
                  categoria === k ? 'bg-dark text-cream border-dark' : 'bg-paper text-dark border-border'
                }`}>
                {l} <span className='opacity-70'>{n}</span>
              </button>
            ))}
          </div>
          {segmentos}
        </>
      )}

      {aviso && <p className='text-[13px] text-[#1c6b3c]'>{aviso}</p>}
      {error && <p className='text-[13px] text-sale'>{error}</p>}

      {visibles.length === 0 ? (
        <p className='py-12 text-center text-[14px] text-muted'>
          {productos.length ? 'No hay piezas con ese filtro.' : 'Todavía no hay piezas.'}
        </p>
      ) : esCompu ? (
        <div className='border bg-paper border-border'>
          <div className={`${COLUMNAS} h-10 px-3 bg-line text-[11px] tracking-[0.12em] uppercase text-muted`}>
            <span /><span>Pieza</span><span>Categoría</span><span>Material</span><span>Precio</span><span>Promo</span><span>Stock</span><span>Visible</span><span />
          </div>
          {visibles.map(p => (
            <FilaPlanilla key={p.id} p={p} ocupado={ocupado}
              onAbrir={() => setAbierta({ producto: p, nuevo: false })}
              onCambios={c => cambiar(p, c)} />
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          {visibles.map(p => (
            <Tarjeta key={p.id} p={p} ocupado={ocupado}
              onAbrir={() => setAbierta({ producto: p, nuevo: false })}
              onCambios={c => cambiar(p, c)} />
          ))}
        </div>
      )}

      <div className='flex flex-wrap items-center justify-between gap-3 mt-2'>
        <button onClick={cargar} disabled={cargando}
          className='h-11 text-[12px] tracking-wide uppercase text-muted hover:text-gold disabled:opacity-40'>
          {cargando ? 'Actualizando…' : 'Actualizar la lista'}
        </button>
        {productos.length > 0 && datos.planilla_configurada && (
          <button onClick={importar} disabled={ocupado}
            className='h-11 text-[12px] underline text-muted hover:text-gold disabled:opacity-40'>
            Traer de la planilla las piezas que falten
          </button>
        )}
      </div>

      {!esCompu && (
        <button onClick={nueva}
          className='fixed z-40 flex items-center gap-2 px-5 text-[12px] tracking-[0.14em] uppercase right-5 bottom-6 h-[52px] bg-dark text-cream shadow-[0_8px_24px_rgba(14,13,12,0.25)]'>
          <span className='text-[18px] leading-none'>+</span> Nueva pieza
        </button>
      )}

      {abierta && (
        <Ficha
          inicial={abierta.producto}
          nuevo={abierta.nuevo}
          categorias={datos.categorias}
          materiales={datos.materiales}
          subidaActiva={datos.fotos_configuradas}
          esCompu={esCompu}
          onCerrar={cerrarFicha}
          onGuardado={alGuardar}
          onSesion={onSinSesion}
        />
      )}
    </div>
  )
}
