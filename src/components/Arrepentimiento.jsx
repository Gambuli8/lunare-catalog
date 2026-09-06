import { useState } from 'react'
import Icon from './Icon'

// ── Botón de arrepentimiento ──────────────────────────────────
// Resolución 424/2020 de la Secretaría de Comercio Interior. El link
// tiene que ser de acceso fácil y directo desde la home, y la norma
// prohíbe pedir registración previa o cualquier trámite extra: por eso
// el formulario está acá nomás, sin login y con el número de pedido
// opcional.
//
// El código de identificación sale en la misma respuesta del servidor.
// La norma da 24 horas para entregarlo; mostrarlo en el momento saca el
// plazo del medio.

const MENSAJES = {
  NOMBRE_REQUERIDO: 'Necesitamos tu nombre.',
  EMAIL_REQUERIDO: 'Necesitamos un correo válido: es a donde te mandamos el código.',
  TELEFONO_INVALIDO: 'Ese teléfono no parece completo.',
  NO_CONFIGURADO: 'El formulario no está disponible en este momento. Escribinos por WhatsApp y lo resolvemos igual.',
  CUERPO_INVALIDO: 'No pudimos leer el formulario. Probá de nuevo.',
}

function Campo({ label, hint, componente: C = 'input', ...props }) {
  return (
    <label className='flex flex-col gap-1.5'>
      <span className='text-[13px] text-muted'>{label}</span>
      <C
        {...props}
        className={`px-3.5 py-3 text-sm bg-paper border border-border outline-none focus:border-gold transition-colors ${C === 'input' ? 'h-11 py-0' : 'min-h-[96px] resize-y'}`}
      />
      {hint && <span className='text-[12px] text-soft'>{hint}</span>}
    </label>
  )
}

export default function Arrepentimiento() {
  const [datos, setDatos] = useState({
    nombre: '', email: '', telefono: '', pedido_numero: '', detalle: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState([])
  const [hecho, setHecho] = useState(null)

  const cambiar = campo => e => setDatos({ ...datos, [campo]: e.target.value })

  const enviar = async e => {
    e.preventDefault()
    setEnviando(true)
    setErrores([])
    try {
      const res = await fetch('/api/arrepentimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      const data = await res.json().catch(() => null)

      if (res.ok && data?.ok) {
        setHecho(data.arrepentimiento)
        window.scrollTo(0, 0)
        return
      }
      const codigos = data?.errores?.map(x => x.codigo) || [data?.error]
      setErrores(codigos.map(c => MENSAJES[c] || 'No pudimos registrar tu pedido. Probá de nuevo.'))
    } catch {
      setErrores(['No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className='px-6 pt-8 pb-24 md:px-12 bg-paper'>
      <div className='max-w-2xl mx-auto'>
        <nav aria-label='Ruta de navegación' className='flex items-center gap-2 mb-6 text-xs tracking-wide text-muted'>
          <a href='/' className='transition-colors hover:text-gold'>Inicio</a>
          <span className='text-[#8f877e]'>/</span>
          <span className='text-dark'>Botón de arrepentimiento</span>
        </nav>

        <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium mb-2'>Tu derecho</p>
        <h1 className='font-serif text-[clamp(34px,5vw,52px)] font-light text-dark mb-6'>
          Botón de arrepentimiento
        </h1>

        {hecho ? (
          <div className='flex flex-col items-start gap-5 p-8 border border-border bg-cream'>
            <Icon name='check' size={26} strokeWidth={1.6} className='text-gold' />
            <div>
              <h2 className='font-serif text-[28px] font-light text-dark'>Recibimos tu pedido</h2>
              <p className='mt-3 text-[15px] leading-relaxed text-muted'>
                Guardá este código, que identifica tu trámite. También te lo mandamos
                por correo a <b className='text-dark'>{datos.email}</b>.
              </p>
            </div>
            <span className='font-serif text-[38px] tracking-wider text-gold'>{hecho.codigo}</span>
            <p className='text-[15px] leading-relaxed text-muted'>
              Te vamos a escribir para coordinar la devolución del importe y, si ya
              tenías la pieza, cómo nos la hacés llegar. No tenés que pagar nada por
              devolverla.
            </p>
          </div>
        ) : (
          <>
            <div className='flex flex-col gap-4 mb-10 text-[15px] leading-relaxed text-muted'>
              <p>
                Si compraste por la web, podés arrepentirte dentro de los{' '}
                <b className='text-dark'>10 días corridos</b> desde que recibiste la
                pieza o desde que hiciste el pedido, lo que pase último. No hace falta
                que expliques por qué, y no te cuesta nada: el costo de la devolución
                lo pagamos nosotros.
              </p>
              <p>
                Completá esto y te devolvemos en el acto un código que identifica tu
                trámite. No necesitás tener cuenta ni registrarte.
              </p>
            </div>

            {errores.length > 0 && (
              <ul className='flex flex-col gap-1.5 p-4 mb-6 border border-sale/30 bg-sale/5'>
                {errores.map((m, i) => (
                  <li key={i} className='text-[13px] text-sale'>{m}</li>
                ))}
              </ul>
            )}

            <form onSubmit={enviar} className='flex flex-col gap-5' noValidate>
              <Campo
                label='Tu nombre'
                value={datos.nombre}
                onChange={cambiar('nombre')}
                autoComplete='name'
              />
              <Campo
                label='Tu correo'
                type='email'
                inputMode='email'
                value={datos.email}
                onChange={cambiar('email')}
                autoComplete='email'
                hint='Acá te mandamos el código del trámite.'
              />
              <Campo
                label='Tu WhatsApp (opcional)'
                type='tel'
                inputMode='tel'
                value={datos.telefono}
                onChange={cambiar('telefono')}
                autoComplete='tel'
              />
              <Campo
                label='Número de pedido (opcional)'
                value={datos.pedido_numero}
                onChange={cambiar('pedido_numero')}
                placeholder='LUN-1000'
                hint='Si no lo tenés a mano, no importa: lo buscamos nosotros.'
              />
              <Campo
                label='Algo que quieras contarnos (opcional)'
                componente='textarea'
                value={datos.detalle}
                onChange={cambiar('detalle')}
                hint='No estás obligada a dar un motivo.'
              />

              <button
                type='submit'
                disabled={enviando}
                className='h-12 mt-2 text-xs tracking-[0.14em] uppercase transition-colors duration-300 border border-dark text-dark hover:bg-dark hover:text-cream disabled:opacity-50'
              >
                {enviando ? 'Enviando…' : 'Enviar mi arrepentimiento'}
              </button>
            </form>
          </>
        )}

        <p className='mt-10 text-[13px] leading-relaxed text-soft'>
          Este derecho está en el artículo 34 de la Ley 24.240 y en el artículo 1.110
          del Código Civil y Comercial. Si querés cambiar una pieza en vez de
          devolverla, mirá <a href='/cambios' className='underline text-muted hover:text-gold'>cambios y devoluciones</a>.
        </p>
      </div>
    </section>
  )
}
