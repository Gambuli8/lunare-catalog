import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useProducts } from '../hooks/useProducts'
import { showToast } from '../components/Toast'
import { trackAddToCart } from '../lib/track'

const CartContext = createContext(null)

const STORAGE_KEY = 'lunare.cart.v1'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 días

// El carrito vive en localStorage: antes se perdía entero al refrescar,
// justo antes del paso a WhatsApp.
function readStoredCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const saved = JSON.parse(raw)
    if (!saved || !Array.isArray(saved.items)) return []
    if (Date.now() - (saved.savedAt || 0) > MAX_AGE) {
      window.localStorage.removeItem(STORAGE_KEY)
      return []
    }
    return saved.items.filter(i => i && i.id && i.qty > 0)
  } catch {
    // Safari en modo privado y navegadores con storage bloqueado tiran acá.
    return []
  }
}

function writeStoredCart(items) {
  try {
    if (!items.length) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), items }))
  } catch {
    /* sin storage el carrito sigue funcionando, solo no sobrevive al refresh */
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart)
  const [isOpen, setIsOpen] = useState(false)
  const { products } = useProducts()
  const reconciled = useRef(false)
  const itemsRef = useRef(items)

  useEffect(() => {
    itemsRef.current = items
    writeStoredCart(items)
  }, [items])

  // Un carrito guardado hace días puede tener precios viejos o piezas que
  // ya no tienen stock. En cuanto llega el catálogo fresco lo reconciliamos
  // para no cotizarle a la clienta un precio que ya no existe.
  // El cálculo va acá y no dentro del updater de setItems: el updater corre
  // en fase de render y el toast sería un setState sobre otro componente.
  useEffect(() => {
    if (!products.length || reconciled.current) return
    reconciled.current = true

    const prev = itemsRef.current
    if (!prev.length) return

    let changed = false
    const next = prev.reduce((acc, item) => {
      const fresh = products.find(p => p.id === item.id)
      if (!fresh) { changed = true; return acc } // se quedó sin stock

      const price = fresh.pricePromo ?? fresh.price
      const qty = Math.min(item.qty, fresh.stock)
      if (price !== item.price || qty !== item.qty) changed = true

      acc.push({ ...fresh, price, qty })
      return acc
    }, [])

    if (!changed) return
    setItems(next)
    showToast(
      next.length
        ? 'Actualizamos tu carrito con los precios y el stock de hoy'
        : 'Las piezas que tenías guardadas ya no tienen stock'
    )
  }, [products])

  const addItem = useCallback(product => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        // No superar el stock disponible
        const maxQty = product.stock ?? existing.stock ?? Infinity
        if (existing.qty >= maxQty) return prev
        return prev.map(i => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...product, qty: 1 }]
    })
    trackAddToCart(product)
    setIsOpen(true)
  }, [])

  const removeItem = useCallback(id => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const changeQty = useCallback((id, delta) => {
    setItems(prev =>
      prev.flatMap(i => {
        if (i.id !== id) return [i]
        const next = i.qty + delta
        if (next <= 0) return []
        // No superar el stock disponible
        const maxQty = i.stock ?? Infinity
        if (next > maxQty) return [i]
        return [{ ...i, qty: next }]
      })
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, changeQty, clear, total, count, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
