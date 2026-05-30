import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const CartContext = createContext(null)

const CART_KEY = 'lunare_cart_v1'

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)
  const [isOpen, setIsOpen] = useState(false)

  // Persistir el carrito ante cualquier cambio
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      /* almacenamiento no disponible (modo privado, etc.) */
    }
  }, [items])

  const addItem = useCallback((product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        // No superar el stock disponible
        const maxQty = product.stock ?? existing.stock ?? Infinity
        if (existing.qty >= maxQty) return prev
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((id) => {
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

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, changeQty, total, count, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
