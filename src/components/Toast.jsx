import { useState, useEffect, useCallback } from 'react'

let _showToast = null
export const showToast = (msg) => _showToast?.(msg)

export default function Toast() {
  const [messages, setMessages] = useState([])

  const add = useCallback((msg) => {
    const id = Date.now()
    setMessages(prev => [...prev, { id, msg }])
    setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 2800)
  }, [])

  useEffect(() => { _showToast = add }, [add])

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {messages.map(m => (
        <div key={m.id}
          className="bg-dark text-white text-sm px-6 py-3 rounded-full font-sans tracking-wide whitespace-nowrap shadow-xl animate-toast-in">
          {m.msg}
        </div>
      ))}
    </div>
  )
}
