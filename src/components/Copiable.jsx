import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

// Un código que se puede copiar de un toque.
//
// En el celular, seleccionar un texto chico con el dedo es incómodo y se
// falla: se copia de más, de menos, o se abre el menú de compartir. Y el
// número de pedido es justo lo que la clienta necesita pegar en WhatsApp.
//
// Accesible: es un botón de verdad —se llega con Tab y se activa con
// Enter o espacio—, dice qué copia en su etiqueta, avisa el resultado
// por una región viva para quien usa lector de pantalla, y la
// confirmación no depende solo del color: cambia el ícono y el texto.

export default function Copiable({ valor, etiqueta = 'código', className = '', children }) {
  const [estado, setEstado] = useState('') // '' | 'copiado' | 'error'
  const reloj = useRef(null)
  const texto = useRef(null)

  useEffect(() => () => clearTimeout(reloj.current), [])

  const copiar = async () => {
    let listo = false

    try {
      // Pide contexto seguro (https). En producción lo es; si no, se cae
      // al método viejo.
      await navigator.clipboard.writeText(valor)
      listo = true
    } catch {
      try {
        const campo = document.createElement('textarea')
        campo.value = valor
        campo.setAttribute('readonly', '')
        campo.style.position = 'fixed'
        campo.style.opacity = '0'
        document.body.appendChild(campo)
        campo.select()
        listo = document.execCommand('copy')
        document.body.removeChild(campo)
      } catch {
        listo = false
      }
    }

    // Si el navegador no deja copiar —pasa en contextos sin https o sin
    // foco—, al menos le dejamos el código seleccionado para que lo copie
    // con el menú del sistema.
    if (!listo && texto.current) {
      try {
        const rango = document.createRange()
        rango.selectNodeContents(texto.current)
        const seleccion = window.getSelection()
        seleccion.removeAllRanges()
        seleccion.addRange(rango)
      } catch { /* si tampoco se puede, queda el aviso de abajo */ }
    }

    setEstado(listo ? 'copiado' : 'error')
    clearTimeout(reloj.current)
    reloj.current = setTimeout(() => setEstado(''), 2500)
  }

  return (
    <span className='inline-flex flex-col items-center gap-0.5'>
      <button
        type='button'
        onClick={copiar}
        aria-label={`Copiar ${etiqueta} ${valor}`}
        className={`group inline-flex items-center gap-2 min-h-[44px] px-2 -mx-2 transition-colors rounded-sm cursor-pointer hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${className}`}
      >
        <span ref={texto}>{children ?? valor}</span>
        <Icon
          name={estado === 'copiado' ? 'check' : 'copiar'}
          size={15}
          strokeWidth={estado === 'copiado' ? 2.4 : 1.7}
          className={`flex-shrink-0 transition-colors ${estado === 'copiado' ? 'text-wa' : 'text-soft group-hover:text-gold'}`}
        />
      </button>

      {/* Lo lee el lector de pantalla y lo ve quien mira: sin esto, el
          único aviso de que se copió sería un cambio de ícono. */}
      <span aria-live='polite' className='text-[11px] tracking-[0.08em] uppercase h-3.5'>
        {estado === 'copiado' && <span className='text-wa'>Copiado</span>}
        {estado === 'error' && <span className='text-muted'>Copialo a mano</span>}
      </span>
    </span>
  )
}
