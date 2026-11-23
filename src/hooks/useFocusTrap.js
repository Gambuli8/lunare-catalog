import { useEffect, useLayoutEffect, useRef } from 'react'

const ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// Para paneles que se comportan como un diálogo (el carrito). Mientras está
// abierto:
//  - el foco entra al panel y Tab / Shift+Tab dan la vuelta adentro, sin
//    escaparse a la página de atrás;
//  - Escape lo cierra;
//  - al cerrarse, el foco vuelve a donde estaba (el botón que lo abrió).
// Cerrado, si el panel sigue montado fuera de pantalla, queda `inert`: sus
// botones no se alcanzan con Tab ni los leen los lectores de pantalla.
// Devuelve el ref para el contenedor del panel.
export function useFocusTrap(abierto, alCerrar) {
  const ref = useRef(null)
  const cerrarRef = useRef(alCerrar)
  cerrarRef.current = alCerrar

  // useLayoutEffect: tiene que dejar de ser inert antes de que el efecto de
  // abajo le dé el foco.
  useLayoutEffect(() => {
    if (ref.current) ref.current.inert = !abierto
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const panel = ref.current
    if (!panel) return

    const antes = document.activeElement
    const enfocables = () =>
      [...panel.querySelectorAll(ENFOCABLES)].filter(el => el.getClientRects().length > 0)

    ;(enfocables()[0] || panel).focus({ preventScroll: true })

    const tecla = e => {
      if (e.key === 'Escape') { cerrarRef.current?.(); return }
      if (e.key !== 'Tab') return

      const lista = enfocables()
      if (!lista.length) { e.preventDefault(); return }
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      const actual = document.activeElement

      if (e.shiftKey && (actual === primero || !panel.contains(actual))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (actual === ultimo || !panel.contains(actual))) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('keydown', tecla)
      if (antes && antes.isConnected) antes.focus({ preventScroll: true })
    }
  }, [abierto])

  return ref
}
