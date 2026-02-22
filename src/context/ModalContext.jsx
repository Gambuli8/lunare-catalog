import { createContext, useContext, useState, useCallback } from 'react'

const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [selectedProduct, setSelectedProduct] = useState(null)

  const openModal  = useCallback((product) => setSelectedProduct(product), [])
  const closeModal = useCallback(() => setSelectedProduct(null), [])

  return (
    <ModalContext.Provider value={{ selectedProduct, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => useContext(ModalContext)
