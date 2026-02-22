# 🌙 Lunare Jewelry — Frontend React + Tailwind

## Stack
- **React 18** + **Vite 5**
- **Tailwind CSS 3**
- Sin librerías externas de UI — diseño 100% custom

## Estructura del proyecto

```
lunare-react/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── context/
    │   └── CartContext.jsx       ← Estado global del carrito
    ├── data/
    │   └── products.js           ← Catálogo (sin precio costo)
    └── components/
        ├── Navbar.jsx
        ├── Hero.jsx
        ├── Catalog.jsx
        ├── ProductCard.jsx
        ├── CartSidebar.jsx
        ├── Contact.jsx
        ├── Cuidados.jsx
        ├── Politicas.jsx
        ├── Footer.jsx
        └── Toast.jsx
```

## Instalación y uso

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar servidor de desarrollo
npm run dev

# 3. Build para producción
npm run build
```

## Funcionalidades

- ✅ **Catálogo filtrable** por categoría y material
- ✅ **Carrito lateral** con control de cantidades
- ✅ **Checkout por WhatsApp** con mensaje prearmado
- ✅ **Precio costo NUNCA expuesto** — solo precio de venta
- ✅ **Solo productos en stock** — sin stock = no aparecen
- ✅ **Responsive** — mobile, tablet, desktop
- ✅ **Secciones**: Inicio, Tienda, Contacto, Cuidados, Políticas

## Checkout por WhatsApp

Al finalizar la compra, se genera un mensaje automático con:
- Lista de productos seleccionados
- Cantidades y precios unitarios
- Total a pagar

Número configurado: `+54 2954-476558`

## Personalización

Para actualizar productos, editá `src/data/products.js`.  
Para cambiar colores, editá `tailwind.config.js`.
