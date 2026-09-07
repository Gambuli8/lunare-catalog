import { useState, useEffect, useMemo } from 'react'
import { useCart } from '../context/CartContext'
import { useProducts, formatPrice } from '../hooks/useProducts'
import { trackCheckout } from '../lib/track'
import CloudinaryImage from './CloudinaryImage'
import Icon, { WhatsAppIcon } from './Icon'

const WHATSAPP = '542954476558'

const MENSAJES = {
  NOMBRE_REQUERIDO: 'Contanos tu nombre.',
  TELEFONO_INVALIDO: 'Necesitamos un teléfono para avisarte.',
  EMAIL_INVALIDO: 'Ese correo no parece válido.',
  ENTREGA_INVALIDA: 'Elegí cómo lo querés recibir.',
  PAGO_INVALIDO: 'Elegí cómo querés pagar.',
  CP_REQUERIDO: 'Poné tu código postal, son 4 números.',
  DIRECCION_REQUERIDA: 'Necesitamos la dirección de entrega.',
  EFECTIVO_SOLO_RETIRO: 'El efectivo es solo para pedidos que se retiran.',
  PEDIDO_VACIO: 'Tu pedido está vacío.',
  CATALOGO_NO_DISPONIBLE: 'No pudimos leer el catálogo. Probá de nuevo en un momento.',
  PEDIDOS_NO_CONFIGURADOS: 'El pedido online no está disponible todavía.',
}

const PASOS = ['Pedido', 'Entrega', 'Datos']

function Pasos({ paso }) {
  return (
    <div className='flex gap-1.5 px-6 pb-4'>
      {PASOS.map((p, i) => (
        <div key={p} className='flex flex-col flex-1 gap-1.5'>
          <span className={`h-0.5 transition-colors duration-500 ${paso > i ? 'bg-dark' : 'bg-border'}`} />
          <span className={`text-[10px] tracking-[0.12em] uppercase transition-colors ${paso === i + 1 ? 'text-dark' : 'text-soft'}`}>
            {i + 1}. {p}
          </span>
        </div>
      ))}
    </div>
  )
}

function Opcion({ activa, onClick, titulo, detalle, costo, costoLibre }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start w-full gap-3 p-4 text-left transition-colors border bg-paper ${activa ? 'border-dark' : 'border-border hover:border-[#cfc5b8]'}`}
    >
      <span className={`grid flex-shrink-0 w-[18px] h-[18px] mt-0.5 border rounded-full place-items-center transition-colors ${activa ? 'border-dark' : 'border-[#c4bcb2]'}`}>
        <span className={`w-2.5 h-2.5 rounded-full bg-dark transition-transform duration-300 ${activa ? 'scale-100' : 'scale-0'}`} />
      </span>
      <span className='flex-grow min-w-0'>
        <span className='block text-sm font-medium text-dark'>{titulo}</span>
        {detalle && <span className='block mt-0.5 text-[12.5px] leading-relaxed text-muted'>{detalle}</span>}
      </span>
      {costo !== undefined && (
        <span className={`text-sm font-medium whitespace-nowrap ${costoLibre ? 'text-wa' : 'text-dark'}`}>
          {costoLibre ? 'Sin cargo' : formatPrice(costo)}
        </span>
      )}
    </button>
  )
}

function Campo({ label, hint, ...props }) {
  return (
    <label className='flex flex-col gap-1.5'>
      <span className='text-[13px] text-muted'>{label}</span>
      <input
        {...props}
        className='h-11 px-3.5 text-sm bg-paper border border-border outline-none focus:border-gold transition-colors'
      />
      {hint && <span className='text-[12px] text-soft'>{hint}</span>}
    </label>
  )
}

export default function CartSidebar() {
  const { items, removeItem, changeQty, total, isOpen, setIsOpen, clear } = useCart()
  const { checkout } = useProducts()

  const [paso, setPaso] = useState(1)
  const [entrega, setEntrega] = useState('retiro_cordoba')
  const [pago, setPago] = useState('transferencia')
  const [datos, setDatos] = useState({ nombre: '', telefono: '', email: '', cp: '', direccion: '' })
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState([])
  const [confirmado, setConfirmado] = useState(null)

  const entregaDef = checkout.entregas.find(e => e.key === entrega)
  const esEnvio = !!entregaDef?.envio
  const envioGratis = esEnvio && total >= checkout.envioGratisDesde
  const costoEnvio = esEnvio && !envioGratis ? entregaDef.costo : 0
  const totalFinal = total + costoEnvio
  const falta = checkout.envioGratisDesde - total

  const pagosPosibles = useMemo(
    () => checkout.pagos.filter(p => !p.soloRetiro || !esEnvio),
    [checkout.pagos, esEnvio]
  )

  // Si pasás de retiro a envío con "efectivo" elegido, esa opción deja de
  // existir: hay que sacarla antes de que el servidor la rechace.
  useEffect(() => {
    if (pagosPosibles.length && !pagosPosibles.some(p => p.key === pago)) {
      setPago(pagosPosibles[0].key)
    }
  }, [pagosPosibles, pago])

  useEffect(() => { if (!isOpen) setErrores([]) }, [isOpen])

  const cerrar = () => {
    setIsOpen(false)
    if (confirmado) { setConfirmado(null); setPaso(1) }
  }

  const textoWhatsApp = () => {
    let m = `¡Hola! Soy ${datos.nombre.trim() || '[tu nombre]'} y quiero hacer este pedido:\n\n`
    items.forEach(i => { m += `• [${i.id}] ${i.name} — ${i.qty} x ${formatPrice(i.price)}\n` })
    m += `\nSubtotal: ${formatPrice(total)}`
    if (entregaDef) m += `\nEntrega: ${entregaDef.etiqueta}${costoEnvio ? ` — ${formatPrice(costoEnvio)}` : ' — sin cargo'}`
    m += `\nTotal: ${formatPrice(totalFinal)}`
    return m
  }

  const irAWhatsApp = () => {
    trackCheckout(items, totalFinal)
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(textoWhatsApp())}`, '_blank', 'noopener')
  }

  const confirmar = async () => {
    setEnviando(true)
    setErrores([])
    try {
      const res = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...datos,
          entrega,
          pago,
          // Solo qué piezas y cuántas: el precio lo pone el servidor.
          items: items.map(i => ({ id: i.id, qty: i.qty })),
        }),
      })
      const data = await res.json().catch(() => null)

      if (res.ok && data?.ok) {
        trackCheckout(items, totalFinal)
        clear()

        // Con Mercado Pago el pedido ya quedó guardado como pendiente y
        // ahora se va a pagar. Si la preferencia no se pudo crear, el
        // servidor manda pago_url en null y cae en la pantalla de
        // siempre: se coordina por WhatsApp.
        if (data.pago_url) {
          window.location.href = data.pago_url
          return
        }

        setConfirmado(data.pedido)
        return
      }
      if (data?.error === 'SIN_STOCK' && data.faltantes?.length) {
        setErrores(data.faltantes.map(f =>
          f.disponible === 0
            ? `${f.nombre} se quedó sin stock.`
            : `De ${f.nombre} queda${f.disponible === 1 ? '' : 'n'} ${f.disponible}.`
        ))
        return
      }
      const codigos = data?.errores?.map(e => e.codigo) || [data?.error]
      setErrores(codigos.map(c => MENSAJES[c] || 'No pudimos confirmar el pedido. Probá de nuevo.'))
    } catch {
      setErrores(['No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'])
    } finally {
      setEnviando(false)
    }
  }

  // Trae un campo a la vista. Si la persona pidió menos movimiento, va
  // instantáneo en vez de animado.
  const traerALaVista = (selector, enfocar = false) => {
    const el = document.querySelector(selector)
    if (!el) return
    const quieta = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: quieta ? 'auto' : 'smooth' })
    // El foco abre el teclado justo sobre el campo correcto; el scroll ya
    // lo hicimos nosotros y centrado, así que no dejamos que lo rehaga.
    if (enfocar) el.focus({ preventScroll: true })
  }

  // Al elegir envío aparecen dos campos nuevos abajo del área visible.
  // Sin traerlos a la vista, no hay ninguna señal de que existen.
  useEffect(() => {
    if (paso !== 2 || !esEnvio) return
    const t = setTimeout(() => traerALaVista('#campo-cp'), 80)
    return () => clearTimeout(t)
  }, [paso, esEnvio])

  const siguiente = () => {
    if (paso === 2 && esEnvio) {
      const fallos = []
      if (!/^\d{4}$/.test(datos.cp)) fallos.push(MENSAJES.CP_REQUERIDO)
      if (datos.direccion.trim().length < 5) fallos.push(MENSAJES.DIRECCION_REQUERIDA)
      if (fallos.length) {
        setErrores(fallos)
        // El error solo se lee arriba de todo, y el campo del que habla
        // queda abajo del área visible: sin esto te dice que algo está mal
        // y no te muestra dónde.
        traerALaVista(!/^\d{4}$/.test(datos.cp) ? '#campo-cp' : '#campo-direccion', true)
        return
      }
    }
    setErrores([])
    setPaso(p => p + 1)
    document.querySelector('#drawer-body')?.scrollTo(0, 0)
  }

  return (
    <>
      <div
        onClick={cerrar}
        className={`fixed inset-0 bg-dark/45 backdrop-blur-[2px] z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      <aside
        aria-label='Tu pedido'
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-cream z-[60] flex flex-col shadow-2xl transition-transform duration-[450ms] ease-[cubic-bezier(.16,1,.3,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className='flex items-center justify-between px-6 py-5 border-b border-border'>
          <div className='flex items-baseline gap-2.5'>
            <h2 className='font-serif text-[26px] font-light'>{confirmado ? 'Pedido confirmado' : 'Tu pedido'}</h2>
            {!confirmado && items.length > 0 && (
              <span className='text-[13px] text-muted'>
                {items.reduce((n, i) => n + i.qty, 0)} {items.reduce((n, i) => n + i.qty, 0) === 1 ? 'pieza' : 'piezas'}
              </span>
            )}
          </div>
          <button
            onClick={cerrar}
            aria-label='Cerrar el pedido'
            className='flex items-center justify-center transition-colors w-11 h-11 -mr-3 text-muted hover:text-dark'
          >
            <Icon name='cerrar' size={18} strokeWidth={1.8} />
          </button>
        </div>

        {confirmado ? (
          <div className='flex flex-col items-center gap-4 px-8 py-16 text-center'>
            <span className='grid w-16 h-16 rounded-full place-items-center bg-wa text-cream'>
              <Icon name='check' size={30} strokeWidth={2.2} />
            </span>
            <h3 className='font-serif text-[26px] font-light'>¡Listo{datos.nombre.trim() ? `, ${datos.nombre.trim()}` : ''}!</h3>
            <span className='font-serif text-[30px] tracking-wider text-gold'>{confirmado.numero}</span>
            <p className='text-sm leading-relaxed text-muted'>
              Te escribimos por WhatsApp para coordinar
              {esEnvio ? ' el envío' : ' el retiro'} y el pago. Guardá el número del pedido.
            </p>
            <a
              href='/tienda'
              onClick={cerrar}
              className='px-8 py-3.5 mt-2 text-xs tracking-[0.14em] uppercase border border-dark hover:bg-dark hover:text-cream transition-colors'
            >
              Seguir mirando
            </a>
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center gap-4 px-8 py-20 text-center'>
            <span className='text-[#8f877e]'><Icon name='bolsa' size={34} strokeWidth={1.2} /></span>
            <h3 className='font-serif text-[26px] font-light'>Tu pedido está vacío</h3>
            <p className='text-sm text-muted'>Elegí las piezas que te gustan y las preparamos para vos.</p>
            <a
              href='/tienda'
              onClick={cerrar}
              className='px-8 py-3.5 mt-2 text-xs tracking-[0.14em] uppercase border border-dark hover:bg-dark hover:text-cream transition-colors'
            >
              Ver la tienda
            </a>
          </div>
        ) : (
          <>
            {checkout.activo && <Pasos paso={paso} />}

            <div id='drawer-body' className='flex flex-col flex-grow gap-4 px-6 py-4 overflow-y-auto'>

              {errores.length > 0 && (
                <div className='flex flex-col gap-1 p-4 text-sm border-l-2 bg-[#f7ecea] border-sale text-[#7d2620]'>
                  {errores.map((e, i) => <span key={i}>{e}</span>)}
                </div>
              )}

              {paso === 1 && items.map(item => {
                const tope = item.qty >= (item.stock ?? Infinity)
                return (
                  <div key={item.id} className='flex gap-4 p-3.5 bg-paper border border-border'>
                    <CloudinaryImage
                      src={item.image}
                      alt={item.name}
                      className='flex-shrink-0 object-cover w-[74px] h-[74px]'
                      fallback={<div className='w-[74px] h-[74px] bg-line' />}
                    />
                    <div className='flex flex-col flex-grow min-w-0 gap-1'>
                      <div className='flex items-start justify-between gap-2'>
                        <span className='font-serif text-[19px] leading-tight'>{item.name}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`Quitar ${item.name} del pedido`}
                          className='flex items-center justify-center flex-shrink-0 transition-colors w-11 h-11 -mt-2.5 -mr-2.5 sm:w-9 sm:h-9 sm:-mt-1.5 sm:-mr-1.5 text-soft hover:text-sale'
                        >
                          <Icon name='cerrar' size={14} strokeWidth={2} />
                        </button>
                      </div>
                      <span className='text-[12px] text-muted'>{item.material} · {item.subcategory}</span>
                      <div className='flex flex-col items-start gap-2.5 mt-2 sm:flex-row sm:items-center sm:justify-between'>
                        <span className='text-[15px] font-medium'>{formatPrice(item.price * item.qty)}</span>
                        <div className='flex items-stretch border border-border bg-paper sm:h-9'>
                          <button
                            onClick={() => changeQty(item.id, -1)}
                            aria-label={`Quitar una unidad de ${item.name}`}
                            className='grid w-11 min-h-[44px] transition-colors sm:w-9 sm:min-h-0 place-items-center hover:bg-line'
                          >
                            <Icon name='menos' size={13} strokeWidth={2.2} />
                          </button>
                          <span className='grid w-8 text-sm place-items-center'>{item.qty}</span>
                          <button
                            onClick={() => changeQty(item.id, 1)}
                            disabled={tope}
                            aria-label={`Agregar una unidad de ${item.name}`}
                            className='grid w-11 min-h-[44px] transition-colors sm:w-9 sm:min-h-0 place-items-center hover:bg-line disabled:text-[#c4bcb2] disabled:hover:bg-transparent'
                          >
                            <Icon name='mas' size={13} strokeWidth={2.2} />
                          </button>
                        </div>
                      </div>
                      {tope && <span className='text-[11px] text-gold mt-0.5'>Es el último que queda</span>}
                    </div>
                  </div>
                )
              })}

              {paso === 1 && checkout.activo && checkout.envioGratisDesde > 0 && (
                <div className='p-3.5 text-[12.5px] leading-relaxed border-l-2 bg-[#f2ece4] border-gold-lt text-muted'>
                  {falta > 0
                    ? <>Te faltan <b className='text-dark'>{formatPrice(falta)}</b> para el envío sin cargo.</>
                    : <>Tu pedido ya tiene <b className='text-dark'>envío sin cargo</b>.</>}
                </div>
              )}

              {paso === 2 && (
                <>
                  <span className='text-[11px] tracking-[0.14em] uppercase text-muted'>Cómo lo recibís</span>
                  {checkout.entregas.map(e => (
                    <Opcion
                      key={e.key}
                      activa={entrega === e.key}
                      onClick={() => { setEntrega(e.key); setErrores([]) }}
                      titulo={e.etiqueta}
                      detalle={e.envio ? 'A coordinar según el código postal' : 'Coordinamos día y punto por WhatsApp'}
                      costo={e.envio && !(total >= checkout.envioGratisDesde) ? e.costo : 0}
                      costoLibre={!e.envio || total >= checkout.envioGratisDesde}
                    />
                  ))}

                  {esEnvio && (
                    <div className='flex flex-col gap-3 mt-1'>
                      <Campo
                        id='campo-cp'
                        label='Código postal'
                        inputMode='numeric'
                        maxLength={4}
                        placeholder='Ej. 6300'
                        value={datos.cp}
                        onChange={e => setDatos({ ...datos, cp: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      />
                      <Campo
                        id='campo-direccion'
                        label='Dirección de entrega'
                        placeholder='Calle, número, piso'
                        value={datos.direccion}
                        onChange={e => setDatos({ ...datos, direccion: e.target.value })}
                      />
                      <p className='text-[12px] leading-relaxed text-soft'>
                        El costo del envío es provisorio hasta que confirmemos la tarifa
                        del correo para tu código postal. Te avisamos antes de despachar.
                      </p>
                    </div>
                  )}
                </>
              )}

              {paso === 3 && (
                <>
                  <Campo
                    label='Tu nombre'
                    placeholder='Cómo te llamás'
                    value={datos.nombre}
                    onChange={e => setDatos({ ...datos, nombre: e.target.value })}
                  />
                  <Campo
                    label='Tu WhatsApp'
                    type='tel'
                    inputMode='tel'
                    placeholder='Para avisarte cuando salga'
                    value={datos.telefono}
                    onChange={e => setDatos({ ...datos, telefono: e.target.value })}
                  />
                  <Campo
                    label='Tu correo (opcional)'
                    type='email'
                    placeholder='Para mandarte el comprobante'
                    value={datos.email}
                    onChange={e => setDatos({ ...datos, email: e.target.value })}
                  />

                  <span className='mt-2 text-[11px] tracking-[0.14em] uppercase text-muted'>Cómo querés pagar</span>
                  {pagosPosibles.map(p => (
                    <Opcion
                      key={p.key}
                      activa={pago === p.key}
                      onClick={() => { setPago(p.key); setErrores([]) }}
                      titulo={p.etiqueta}
                      detalle={
                        p.key === 'mercadopago' ? 'Te mandamos el link de pago por WhatsApp'
                          : p.key === 'transferencia' ? 'Te pasamos el CBU y confirmás el comprobante'
                            : 'Pagás al retirar la pieza'
                      }
                    />
                  ))}
                </>
              )}
            </div>

            <div className='flex flex-col gap-3 px-6 py-5 border-t border-border'>
              {paso > 1 && costoEnvio > 0 && (
                <div className='flex justify-between text-sm text-muted'>
                  <span>Envío</span><span>{formatPrice(costoEnvio)}</span>
                </div>
              )}
              <div className='flex items-baseline justify-between'>
                <span className='font-serif text-[24px] font-light'>Total</span>
                <span className='font-serif text-[30px] font-medium'>{formatPrice(paso > 1 ? totalFinal : total)}</span>
              </div>

              {checkout.activo ? (
                <div className='flex gap-2.5'>
                  {paso > 1 && (
                    <button
                      onClick={() => { setErrores([]); setPaso(p => p - 1) }}
                      className='px-5 text-xs tracking-[0.12em] uppercase border border-border text-muted hover:border-dark hover:text-dark transition-colors min-h-[52px]'
                    >
                      Atrás
                    </button>
                  )}
                  <button
                    onClick={paso === 3 ? confirmar : siguiente}
                    disabled={enviando}
                    className='flex items-center justify-center flex-grow gap-2.5 min-h-[52px] px-6 text-xs tracking-[0.14em] uppercase transition-colors bg-dark text-cream hover:bg-[#2e2a26] disabled:opacity-60'
                  >
                    {enviando ? 'Confirmando…' : paso === 3 ? 'Confirmar pedido' : 'Continuar'}
                    {!enviando && paso < 3 && <Icon name='flecha' size={14} strokeWidth={1.9} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={irAWhatsApp}
                  className='flex items-center justify-center w-full gap-2.5 min-h-[56px] text-xs tracking-[0.14em] uppercase transition-colors bg-wa text-cream hover:bg-wa-dark'
                >
                  <WhatsAppIcon size={18} />
                  Finalizar por WhatsApp
                </button>
              )}

              {checkout.activo && (
                <button
                  onClick={irAWhatsApp}
                  className='min-h-[44px] text-[12.5px] text-muted hover:text-gold transition-colors [@media(max-height:620px)]:hidden'
                >
                  ¿Preferís coordinarlo por WhatsApp?
                </button>
              )}

              <p className='text-[12px] text-center text-muted [@media(max-height:620px)]:hidden'>
                Guardamos tu pedido por 7 días, aunque cierres la página.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
