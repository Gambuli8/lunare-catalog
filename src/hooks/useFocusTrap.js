import { useEffect, useRef } from 'react'

// Selector de elementos enfocables dentro del diálogo
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// useFocusTrap — accesibilidad para modales / paneles tipo diálogo.
// Mientras `active` es true:
//  - mueve el foco dentro del contenedor,
//  - atrapa Tab / Shift+Tab para no salir del diálogo,
//  - llama onEscape al presionar Escape,
//  - al cerrarse, devuelve el foco al elemento que lo tenía antes.
// Devuelve un ref para asignar al contenedor del diálogo.
export function useFocusTrap(active, onEscape) {
  const ref = useRef(null)
  // Guardamos onEscape en un ref para no re-ejecutar el efecto en cada render
  const escRef = useRef(onEscape)
  escRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement

    const getFocusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      )

    // Foco inicial: primer elemento enfocable o el contenedor mismo
    const initial = getFocusables()[0] || node
    initial.focus?.()

    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        escRef.current?.()
        return
      }
      if (e.key !== 'Tab') return

      const focusables = getFocusables()
      if (focusables.length === 0) {
        e.preventDefault()
        node.focus?.()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement

      if (e.shiftKey) {
        if (activeEl === first || !node.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else if (activeEl === last || !node.contains(activeEl)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Devolvemos el foco a donde estaba (si sigue en el documento)
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus?.()
      }
    }
  }, [active])

  return ref
}
