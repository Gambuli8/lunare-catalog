import { useState, useEffect, useMemo } from 'react'
import { useCart } from '../context/CartContext'
import { useProducts, formatPrice } from '../hooks/useProducts'
import { trackCheckout } from '../lib/track'
import { guardarPagoPendiente, leerPagoPendiente } from '../lib/pagoPendiente'
import { opcionesDeEnvio, cpValido, MODOS } from '../lib/envios'
import CloudinaryImage from './CloudinaryImage'
import Icon, { WhatsAppIcon } from './Icon'
import Copiable from './Copiable'

const WHATSAPP = '542954476558'

const MENSAJES = {
  NOMBRE_REQUERIDO: 'Contanos tu nombre.',
  TELEFONO_INVALIDO: 'Necesitamos un teléfono para avisarte.',
  EMAIL_INVALIDO: 'Ese correo no parece válido.',
  ENTREGA_INVALIDA: 'Elegí cómo lo querés recibir.',
  PAGO_INVALIDO: 'Elegí cómo querés pagar.',
  CP_REQUERIDO: 'Poné tu código postal, son 4 números.',
  DIRECCION_REQUERIDA: 'Necesitamos la dirección de entrega.',
  CP_SIN_COBERTURA: 'No tenemos tarifa para ese código postal. Escribinos y lo vemos.',
  ENVIO_NO_DISPONIBLE: 'Elegí con qué transporte querés recibirlo.',
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

function Opcion({ activa, onClick, titulo, detalle, costo, costoLibre, deshabilitada }) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitada}
      className={`flex items-start w-full gap-3 p-4 text-left transition-colors border bg-paper ${activa ? 'border-dark' : 'border-border hover:border-[#cfc5b8]'} ${deshabilitada ? 'opacity-50 hover:border-border' : ''}`}
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
          {/* null: todavía no sabemos el código postal. */}
          {costoLibre ? 'Sin cargo' : costo === null ? '—' : formatPrice(costo)}
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
  // Qué transporte eligió: Andreani, Correo Argentino, Integral Pack. Va
  // aparte de la entrega, que solo dice si es a domicilio o a sucursal.
  const [transporte, setTransporte] = useState('')
  const [opcionesServidor, setOpcionesServidor] = useState(null)
  const [datos, setDatos] = useState({ nombre: '', telefono: '', email: '', cp: '', direccion: '' })
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState([])
  const [confirmado, setConfirmado] = useState(null)
  // El pedido que se está yendo a pagar a Mercado Pago, y uno que quedó
  // sin pagar de una visita anterior.
  const [redirigiendo, setRedirigiendo] = useState(null)
  const [pendiente, setPendiente] = useState(null)

  const entregaDef = checkout.entregas.find(e => e.key === entrega)
  const esEnvio = !!entregaDef?.envio
  const aDomicilio = entregaDef?.modo === 'domicilio'
  const retiros = useMemo(() => checkout.entregas.filter(e => !e.envio), [checkout.entregas])

  // Las opciones que le llegan a ese código postal, con el precio de cada
  // transporte. Se calculan acá contra la tabla que vino con el catálogo,
  // para que aparezcan mientras escribe; lo que se cobra lo decide el
  // servidor al confirmar.
  const opcionesLocales = useMemo(
    () => opcionesDeEnvio(checkout.zonas, datos.cp),
    [checkout.zonas, datos.cp]
  )
  // Las de la tabla se ven al instante; el servidor las confirma y, si hay
  // contrato de Andreani, trae su tarifa de verdad para ese CP y ese peso.
  const opciones = opcionesServidor ?? opcionesLocales
  const opcionElegida = opciones.find(o => o.entrega === entrega && o.transporte === transporte)

  const envioGratis = total >= checkout.envioGratisDesde
  const costoEnvio = !esEnvio || envioGratis ? 0 : (opcionElegida?.costo ?? 0)
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

  useEffect(() => { if (isOpen) setPendiente(leerPagoPendiente()) }, [isOpen])

  // Al terminar de escribir el código postal le preguntamos al servidor.
  // Si no contesta, quedan los precios de la tabla: nadie se queda sin
  // poder elegir envío porque se cayó una API.
  // Ojo: no depende del paso. Si se descartaran al pasar al paso 3, el
  // resumen volvería a los precios de la tabla y podría mostrar un envío
  // que no es el que se eligió —o gratis, si esa opción no está en la
  // tabla—. Se limpian solo cuando cambia el código postal.
  useEffect(() => {
    if (!cpValido(datos.cp)) { setOpcionesServidor(null); return }

    const corte = new AbortController()
    const piezas = items.reduce((n, i) => n + i.qty, 0)
    const espera = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/envio?cp=${datos.cp}&piezas=${piezas}&valor=${Math.round(total)}`,
          { signal: corte.signal }
        )
        const data = await res.json()
        if (data?.ok && Array.isArray(data.opciones)) setOpcionesServidor(data.opciones)
      } catch { /* se sigue con la tabla que vino con el catálogo */ }
    }, 350)

    return () => { clearTimeout(espera); corte.abort() }
  }, [datos.cp, total, items.length])

  // Si vuelve con "atrás" desde Mercado Pago, el navegador puede restaurar
  // la página tal cual quedó: con el "Te llevamos a Mercado Pago" puesto.
  useEffect(() => {
    const alVolver = e => { if (e.persisted) setRedirigiendo(null) }
    window.addEventListener('pageshow', alVolver)
    return () => window.removeEventListener('pageshow', alVolver)
  }, [])

  const vaAMercadoPago = paso === 3 && pago === 'mercadopago' && checkout.mp

  const cerrar = () => {
    setIsOpen(false)
    if (confirmado) { setConfirmado(null); setPaso(1) }
  }

  const textoWhatsApp = () => {
    let m = `¡Hola! Soy ${datos.nombre.trim() || '[tu nombre]'} y quiero hacer este pedido:\n\n`
    items.forEach(i => { m += `• [${i.id}] ${i.name} — ${i.qty} x ${formatPrice(i.price)}\n` })
    m += `\nSubtotal: ${formatPrice(total)}`
    if (entregaDef) {
      const como = transporte ? `${entregaDef.etiqueta} — ${transporte}` : entregaDef.etiqueta
      m += `\nEntrega: ${como}${costoEnvio ? ` — ${formatPrice(costoEnvio)}` : ' — sin cargo'}`
    }
    m += `\nTotal: ${formatPrice(totalFinal)}`
    return m
  }

  // Link de verdad y no window.open: el navegador de Instagram —de donde
  // viene casi todo el tráfico— y varios del celular bloquean las ventanas
  // abiertas por script sin avisar, y el botón parecía no hacer nada.
  const linkWhatsApp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(textoWhatsApp())}`
  const irAWhatsApp = () => trackCheckout(items, totalFinal)

  // El mensaje del pedido ya confirmado. Va con el número adelante: es lo
  // que Lunare busca en el panel para saber de qué pedido le hablan.
  const textoConfirmado = pedido => {
    const quien = datos.nombre.trim() ? `Soy ${datos.nombre.trim()}. ` : ''
    const como = esEnvio
      ? `envío${transporte ? ` por ${transporte}` : ''}`
      : entregaDef?.etiqueta || 'retiro'
    const cierre = pedido.pago === 'efectivo'
      ? 'Quiero coordinar el retiro y pago en efectivo cuando lo busque.'
      : pedido.pago === 'transferencia'
        ? 'Necesito los datos para transferir.'
        : 'Quiero coordinar el pago.'
    return `¡Hola! ${quien}Hice el pedido ${pedido.numero} en la web (${como}, ${formatPrice(pedido.total ?? totalFinal)}). ${cierre}`
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
          transporte,
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
          guardarPagoPendiente({
            id: data.pedido.id,
            numero: data.pedido.numero,
            total: data.pedido.total ?? totalFinal,
            url: data.pago_url,
          })
          setRedirigiendo({ numero: data.pedido.numero, url: data.pago_url })
          // Un momento para que se lea adónde va y con qué número. Sin esto
          // la pantalla salta de golpe a otro sitio y parece que algo falló.
          setTimeout(() => { window.location.href = data.pago_url }, 1400)
          return
        }

        setConfirmado({ ...data.pedido, pago })
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

  // Al elegir un envío a domicilio aparece la dirección abajo del área
  // visible. Sin traerla a la vista, no hay señal de que exista.
  useEffect(() => {
    if (paso !== 2 || !aDomicilio) return
    const t = setTimeout(() => traerALaVista('#campo-direccion'), 80)
    return () => clearTimeout(t)
  }, [paso, aDomicilio])

  const siguiente = () => {
    if (paso === 2 && esEnvio) {
      const fallos = []
      if (!cpValido(datos.cp)) fallos.push(MENSAJES.CP_REQUERIDO)
      // Sin una opción válida para ese código postal no se puede seguir:
      // el servidor lo rechazaría al confirmar.
      else if (!opciones.length) fallos.push(MENSAJES.CP_SIN_COBERTURA)
      else if (!opcionElegida) fallos.push(MENSAJES.ENVIO_NO_DISPONIBLE)
      if (aDomicilio && datos.direccion.trim().length < 5) fallos.push(MENSAJES.DIRECCION_REQUERIDA)
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

        {redirigiendo ? (
          <div role='status' aria-live='polite' className='flex flex-col items-center gap-4 px-8 py-16 text-center'>
            <span className='relative grid w-16 h-16 place-items-center text-gold'>
              <span className='absolute inset-0 border rounded-full border-border' />
              <span className='absolute inset-0 border border-transparent rounded-full border-t-gold animate-spin' />
              <Icon name='tarjeta' size={24} strokeWidth={1.5} />
            </span>
            <h3 className='font-serif text-[26px] font-light'>Te llevamos a Mercado Pago</h3>
            <Copiable valor={redirigiendo.numero} etiqueta='número de pedido' className='font-serif text-[30px] tracking-wider text-gold' />
            <p className='text-sm leading-relaxed text-muted'>
              Tu pedido ya quedó guardado y las piezas, reservadas.
              Cuando termines de pagar, volvés a la tienda.
            </p>
            <a href={redirigiendo.url} className='min-h-[44px] inline-flex items-center text-[13px] text-muted underline underline-offset-4 hover:text-dark'>
              Si no se abre, tocá acá
            </a>
          </div>
        ) : confirmado ? (
          <div className='flex flex-col items-center gap-4 px-8 py-16 text-center'>
            <span className='grid w-16 h-16 rounded-full place-items-center bg-wa text-cream'>
              <Icon name='check' size={30} strokeWidth={2.2} />
            </span>
            <h3 className='font-serif text-[26px] font-light'>¡Listo{datos.nombre.trim() ? `, ${datos.nombre.trim()}` : ''}!</h3>
            <Copiable valor={confirmado.numero} etiqueta='número de pedido' className='font-serif text-[30px] tracking-wider text-gold' />
            <p className='text-sm leading-relaxed text-muted'>
              {confirmado.pago === 'mercadopago'
                ? `${checkout.mp ? 'No pudimos abrir Mercado Pago en este momento. ' : ''}Te escribimos por WhatsApp con el link de pago.`
                : confirmado.pago === 'efectivo'
                  ? 'Escribinos y cerramos el retiro: acordamos el día y el punto, y pagás en efectivo cuando lo retirás.'
                  : `Te pasamos los datos para transferir por WhatsApp y coordinamos ${esEnvio ? 'el envío' : 'el retiro'}.`}
              {' '}Guardá el número del pedido.
            </p>

            {/* Con efectivo la venta se termina de cerrar por WhatsApp, así
                que el botón es la acción principal y no una alternativa. */}
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(textoConfirmado(confirmado))}`}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center justify-center w-full gap-2.5 min-h-[52px] mt-2 text-xs tracking-[0.14em] uppercase transition-colors bg-wa text-cream hover:bg-wa-dark'
            >
              <WhatsAppIcon size={17} />
              {confirmado.pago === 'efectivo'
                ? (esEnvio ? 'Coordinar por WhatsApp' : 'Coordinar el retiro')
                : confirmado.pago === 'transferencia' ? 'Pedir los datos para transferir'
                  : 'Escribirnos por WhatsApp'}
            </a>
            <a
              href='/tienda'
              onClick={cerrar}
              className='min-h-[44px] inline-flex items-center text-[13px] text-muted hover:text-dark transition-colors'
            >
              Seguir mirando
            </a>
          </div>
        ) : items.length === 0 && pendiente ? (
          <div className='flex flex-col items-center gap-4 px-8 py-16 text-center'>
            <span className='grid w-16 h-16 border rounded-full place-items-center border-gold-lt text-gold'>
              <Icon name='reloj' size={28} strokeWidth={1.4} />
            </span>
            <h3 className='font-serif text-[26px] font-light leading-tight'>Tenés un pedido esperando el pago</h3>
            <Copiable valor={pendiente.numero} etiqueta='número de pedido' className='font-serif text-[30px] tracking-wider text-gold' />
            <p className='text-sm leading-relaxed text-muted'>
              Te reservamos las piezas por 24 horas. Si ya pagaste, no tenés que hacer nada.
            </p>
            <a
              href={pendiente.url}
              className='inline-flex items-center justify-center gap-2.5 w-full min-h-[52px] mt-2 text-xs tracking-[0.14em] uppercase transition-colors bg-dark text-cream hover:bg-[#2e2a26]'
            >
              Terminar el pago
              <Icon name='flecha' size={14} strokeWidth={1.9} />
            </a>
            <a href='/tienda' onClick={cerrar} className='min-h-[44px] inline-flex items-center text-[13px] text-muted hover:text-dark'>
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
                  <span className='text-[11px] tracking-[0.14em] uppercase text-muted'>Retirar en persona</span>
                  {retiros.map(e => (
                    <Opcion
                      key={e.key}
                      activa={entrega === e.key}
                      onClick={() => { setEntrega(e.key); setTransporte(''); setErrores([]) }}
                      titulo={e.etiqueta}
                      detalle='Coordinamos día y punto por WhatsApp'
                      costo={0}
                      costoLibre
                    />
                  ))}

                  <span className='mt-3 text-[11px] tracking-[0.14em] uppercase text-muted'>
                    O que te lo mandemos
                  </span>
                  <Campo
                    id='campo-cp'
                    label='Tu código postal'
                    inputMode='numeric'
                    maxLength={4}
                    placeholder='Ej. 6300'
                    hint={!cpValido(datos.cp) ? 'Con el código postal te mostramos los transportes que llegan y cuánto sale cada uno.' : undefined}
                    value={datos.cp}
                    onChange={e => setDatos({ ...datos, cp: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  />

                  {cpValido(datos.cp) && (
                    opciones.length === 0 ? (
                      <p className='p-3.5 text-[12.5px] leading-relaxed border-l-2 bg-[#f2ece4] border-gold-lt text-muted'>
                        Todavía no tenemos tarifa para ese código postal. Escribinos por
                        WhatsApp y lo resolvemos con vos.
                      </p>
                    ) : (
                      opciones.map(o => (
                        <Opcion
                          key={o.id}
                          activa={opcionElegida?.id === o.id}
                          onClick={() => { setEntrega(o.entrega); setTransporte(o.transporte); setErrores([]) }}
                          titulo={`${o.transporte} · ${MODOS[o.modo].etiqueta}`}
                          detalle={[o.zona, o.dias && `llega en ${o.dias} ${o.dias.trim() === '1' ? 'día hábil' : 'días hábiles'}`].filter(Boolean).join(' · ')}
                          costo={envioGratis ? 0 : o.costo}
                          costoLibre={envioGratis}
                        />
                      ))
                    )
                  )}

                  {esEnvio && (
                    <div className='flex flex-col gap-3 mt-1'>
                      {aDomicilio && (
                        <Campo
                          id='campo-direccion'
                          label='Dirección de entrega'
                          placeholder='Calle, número, piso'
                          value={datos.direccion}
                          onChange={e => setDatos({ ...datos, direccion: e.target.value })}
                        />
                      )}
                      <p className='text-[12px] leading-relaxed text-soft'>
                        {aDomicilio
                          ? 'Cuando despachamos te pasamos el número de seguimiento por WhatsApp.'
                          : 'La sucursal exacta la coordinamos por WhatsApp, y te pasamos el número de seguimiento cuando despachamos.'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {paso === 3 && (
                <>
                  {/* El repaso antes de confirmar: qué se lleva, cómo le
                      llega y cuánto es cada cosa. Sin esto, el último paso
                      pide datos y cobra sin mostrar qué se está pagando. */}
                  <div className='flex flex-col gap-2.5 p-4 border bg-paper border-border'>
                    <span className='text-[11px] tracking-[0.14em] uppercase text-muted'>Tu pedido</span>

                    {items.map(i => (
                      <div key={i.id} className='flex items-baseline justify-between gap-3 text-[13px]'>
                        <span className='min-w-0 text-dark'>
                          <span className='text-muted'>{i.qty}×</span> {i.name}
                        </span>
                        <span className='whitespace-nowrap text-dark'>{formatPrice(i.price * i.qty)}</span>
                      </div>
                    ))}

                    <div className='flex items-baseline justify-between gap-3 pt-2.5 text-[13px] border-t border-line text-muted'>
                      <span>Subtotal</span>
                      <span>{formatPrice(total)}</span>
                    </div>

                    <div className='flex items-baseline justify-between gap-3 text-[13px] text-muted'>
                      <span className='min-w-0'>
                        {esEnvio
                          ? `Envío · ${transporte} ${aDomicilio ? 'a domicilio' : 'a sucursal'}`
                          : entregaDef?.etiqueta || 'Retiro'}
                      </span>
                      <span className={`whitespace-nowrap ${costoEnvio === 0 ? 'text-wa' : ''}`}>
                        {costoEnvio === 0 ? 'Sin cargo' : formatPrice(costoEnvio)}
                      </span>
                    </div>

                    {esEnvio && aDomicilio && datos.direccion.trim() && (
                      <p className='text-[12px] leading-relaxed text-soft'>
                        {datos.direccion.trim()}{datos.cp && ` · CP ${datos.cp}`}
                      </p>
                    )}

                    <div className='flex items-baseline justify-between gap-3 pt-2.5 border-t border-line'>
                      <span className='text-[13px] text-dark'>Total</span>
                      <span className='font-serif text-[22px] text-dark'>{formatPrice(totalFinal)}</span>
                    </div>
                  </div>

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
                        p.key === 'mercadopago'
                          ? (checkout.mp ? 'Pagás ahora con tarjeta, débito o dinero en cuenta' : 'Te mandamos el link de pago por WhatsApp')
                          : p.key === 'transferencia' ? 'Te pasamos el CBU y confirmás el comprobante'
                            : 'Pagás al retirar la pieza'
                      }
                    />
                  ))}

                  {vaAMercadoPago && (
                    <p className='p-3.5 text-[12.5px] leading-relaxed border-l-2 bg-[#f2ece4] border-gold-lt text-muted'>
                      Al tocar <b className='font-medium text-dark'>Ir a pagar</b> te llevamos a Mercado Pago.
                      Tu pedido queda guardado y las piezas, reservadas por 24 horas.
                    </p>
                  )}
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
                    {enviando
                      ? (vaAMercadoPago ? 'Preparando el pago…' : 'Confirmando…')
                      : paso < 3 ? 'Continuar' : vaAMercadoPago ? 'Ir a pagar' : 'Confirmar pedido'}
                    {!enviando && (paso < 3 || vaAMercadoPago) && <Icon name='flecha' size={14} strokeWidth={1.9} />}
                  </button>
                </div>
              ) : (
                // Salida de emergencia: solo se ve si el pedido online no
                // está disponible. Va con el estilo de la tienda y no como
                // un bloque verde, que competía con el checkout de verdad.
                <>
                  <p className='text-[12.5px] leading-relaxed text-muted'>
                    El pedido online no está disponible en este momento. Mandanos
                    tu pedido por WhatsApp y lo cerramos ahí.
                  </p>
                  <a
                    href={linkWhatsApp}
                    target='_blank'
                    rel='noopener noreferrer'
                    onClick={irAWhatsApp}
                    className='flex items-center justify-center w-full gap-2.5 min-h-[52px] text-xs tracking-[0.14em] uppercase transition-colors bg-dark text-cream hover:bg-[#2e2a26]'
                  >
                    <WhatsAppIcon size={17} />
                    Hacer el pedido por WhatsApp
                  </a>
                </>
              )}


              <p className='text-[12px] text-center text-muted [@media(max-height:620px)]:hidden'>
                Guardamos tu carrito por 7 días, aunque cierres la página.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
