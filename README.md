# 🌙 Lunare Accesorios — Frontend React + Tailwind

## Stack
- **React 18** + **Vite 5**
- **Tailwind CSS 3**
- Función serverless en Vercel para leer el catálogo
- Sin librerías externas de UI — diseño 100% custom

## Estructura del proyecto

```
lunare-catalog/
├── index.html
├── vite.config.js            ← incluye el middleware que sirve /api en dev
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── api/
│   └── products.js           ← lee el Sheet en el servidor y normaliza el catálogo
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── context/
    │   ├── CartContext.jsx   ← carrito global, persistido en localStorage
    │   └── ModalContext.jsx
    ├── hooks/
    │   └── useProducts.js    ← store compartido; pide /api/products
    └── components/
        ├── Navbar.jsx
        ├── Hero.jsx
        ├── FeaturedProducts.jsx
        ├── Catalog.jsx
        ├── ProductCard.jsx
        ├── ProductModal.jsx
        ├── CloudinaryImage.jsx
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

# 2. Configurar la URL del Sheet
cp .env.example .env   # y completá SHEET_CSV_URL

# 3. Levantar servidor de desarrollo
npm run dev

# 4. Build para producción
npm run build
```

`npm run dev` sirve `/api/products` con un middleware de Vite, así que no hace
falta la CLI de Vercel. En producción lo sirve Vercel como función serverless.

## Catálogo y precios

El catálogo sale de un Google Sheet publicado como CSV. **La URL del Sheet la
lee únicamente el servidor**, en `api/products.js`, desde la variable de entorno
`SHEET_CSV_URL`. El navegador solo habla con `/api/products`, que devuelve los
productos ya normalizados y **sin la columna `Precio costo`**.

### ⚠️ Pendiente en Google Sheets

Mover la URL al servidor evita que se filtre de acá en adelante, pero **no
alcanza por sí solo**:

1. La URL vieja quedó en el historial público de git
   (`src/hooks/useProducts.js`, commits anteriores a este). Sigue siendo válida
   y sigue devolviendo la columna de costo.
2. Hay que dejar de publicar esa columna: en el Sheet, crear una hoja aparte que
   traiga solo las columnas necesarias — por ejemplo
   `=QUERY(Hoja1!A:K; "select A,B,C,D,F,G,H,I,J,K"; 1)`, sin la E de costo —
   publicar **esa** hoja, y despublicar la actual (Archivo → Compartir →
   Publicar en la web → Detener publicación).
3. Poner la URL nueva en `SHEET_CSV_URL`, en Vercel y en el `.env` local.

Hasta que se hagan los pasos 2 y 3, el costo, el stock y los productos sin
publicar siguen siendo accesibles con la URL vieja.

### Columnas que espera el CSV

```
Id | Nombre | Categoría | Material | Precio costo | Precio individual |
Precio Par | Stock | Imagen | Destacado | Precio promo
```

- **Stock ≤ 0** → el producto no aparece.
- **Sin `Id`** → el producto no aparece (el código va en el mensaje de WhatsApp
  y es lo que identifica cada ítem del carrito).
- **`Precio promo`** solo se usa si es menor al precio normal.
- **`Destacado`** acepta `si`, `sí`, `yes`, `1` o `true`.

El endpoint cachea la respuesta 60 s en el CDN de Vercel y revalida por atrás,
así que una visita nunca espera a Google Sheets.

## Funcionalidades

- ✅ **Catálogo filtrable** por categoría y material, con búsqueda por nombre
- ✅ **Carrito lateral** con control de cantidades y tope por stock
- ✅ **Carrito persistente** — sobrevive al refresh 7 días (localStorage) y se
  reconcilia con los precios y el stock del día al volver
- ✅ **Checkout por WhatsApp** con mensaje prearmado
- ✅ **Precio costo fuera del navegador** — ver la advertencia de arriba
- ✅ **Solo productos en stock** — sin stock = no aparecen
- ✅ **Responsive** — mobile, tablet, desktop
- ✅ **Secciones**: Inicio, Tienda, Contacto, Cuidados, Políticas

## Checkout por WhatsApp

Al finalizar la compra se genera un mensaje automático con la lista de
productos, cantidades, precios unitarios y el total.

Número configurado: `+54 2954-476558` (`src/components/CartSidebar.jsx`).

## Personalización

- **Productos**: se editan en el Google Sheet, no en el código.
- **Colores y tipografías**: `tailwind.config.js`.
- **Normalización de categorías, materiales y nombres**: `api/products.js`.
