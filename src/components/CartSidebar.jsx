import { useCart } from '../context/CartContext'
import { formatPrice } from '../hooks/useProducts'

export default function CartSidebar() {
  const { items, removeItem, changeQty, total, isOpen, setIsOpen } = useCart()

  const checkout = () => {
    if (!items.length) return
    let msg = '¡Hola! Me gustaría hacer el siguiente pedido:\n\n'
    items.forEach(i => {
      msg += `• ${i.name} (${i.material}) — ${i.qty} x ${formatPrice(i.price)} = ${formatPrice(i.price * i.qty)}\n`
    })
    msg += `\n*Total: ${formatPrice(total)}*\n\n¿Podemos coordinar la compra? 😊`
    window.open(`https://wa.me/542954476558?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-cream z-[60] flex flex-col shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-5 border-b border-border'>
          <h3 className='font-serif text-2xl font-light'>Tu Carrito</h3>
          <button
            onClick={() => setIsOpen(false)}
            className='text-lg transition-colors text-muted hover:text-dark'
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className='flex flex-col flex-1 gap-4 px-6 py-5 overflow-y-auto'>
          {items.length === 0 ? (
            <p className='mt-12 font-sans text-sm text-center text-muted'>Tu carrito está vacío.</p>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className='flex gap-4 p-4 bg-white border rounded-sm border-border'
              >
                <div className='w-14 h-14 bg-[#ede7df] rounded-sm flex items-center justify-center text-2xl flex-shrink-0'>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className='object-cover w-full h-full rounded-sm'
                    />
                  ) : (
                    item.emogi
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='font-serif text-[17px] capitalize leading-tight truncate'>{item.name}</p>
                  <p className='text-[10px] text-muted tracking-wide uppercase font-sans mt-0.5'>
                    {item.material} · {item.subcategory}
                  </p>
                  <div className='flex items-center justify-between mt-2.5'>
                    <span className='font-sans text-sm font-medium'>{formatPrice(item.price * item.qty)}</span>
                    <div className='flex items-center gap-2.5'>
                      <button
                        onClick={() => changeQty(item.id, -1)}
                        className='flex items-center justify-center w-6 h-6 text-sm transition-all duration-200 border rounded-full border-border hover:bg-dark hover:text-white hover:border-dark'
                      >
                        −
                      </button>
                      <span className='text-sm min-w-[16px] text-center font-sans'>{item.qty}</span>
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        className='flex items-center justify-center w-6 h-6 text-sm transition-all duration-200 border rounded-full border-border hover:bg-dark hover:text-white hover:border-dark'
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className='ml-1 text-xs transition-colors duration-200 text-muted hover:text-red-500'
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className='flex flex-col gap-4 px-6 py-5 border-t border-border'>
            <div className='flex justify-between font-serif text-[22px] font-light'>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              onClick={checkout}
              className='w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe59] text-white text-xs tracking-[0.15em] uppercase font-sans py-3.5 transition-colors duration-200'
            >
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
              </svg>
              Finalizar por WhatsApp
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
