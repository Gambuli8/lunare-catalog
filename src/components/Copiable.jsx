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

  // El aviso va fuera del flujo, no debajo del botón.
  //
  // Antes era una fila más de la columna, así que el componente medía 60 px
  // —los 44 del área táctil más el aviso— y el texto quedaba 8 px por
  // encima del centro: al lado del material, en la ficha, el código
  // aparecía levantado respecto de "PLATA".
  //
  // Sacándolo del flujo, el alto lo da el botón y el texto queda centrado
  // como cualquier otro hermano de la fila.
  return (
    <span className='relative inline-flex'>
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

      {/* El aviso solo se escucha; lo que se ve es el ícono, que pasa de
          las dos hojas al tilde.
          Antes también se leía, en una línea debajo del botón, y esa línea
          era el problema: ocupaba lugar siempre, descentraba el código y,
          al sacarla del flujo, se le montaba al título del producto. No hay
          un lugar libre que sirva en los dos usos —el código de la ficha y
          el número de pedido del carrito—, y el cambio de ícono ya avisa
          sin depender del color. */}
      <span aria-live='polite' className='sr-only'>
        {estado === 'copiado' && 'Copiado'}
        {estado === 'error' && 'No se pudo copiar, copialo a mano'}
      </span>
    </span>
  )
}
