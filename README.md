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
├── vercel.json               ← reescrituras: /producto/:slug y /sitemap.xml
├── middleware.js             ← modo mantenimiento (corre antes que todo)
├── public/
│   └── robots.txt
├── api/
│   ├── _catalog.js           ← lee el Sheet en el servidor y normaliza (no es endpoint)
│   ├── _html.js              ← utilidades del prerender (no es endpoint)
│   ├── products.js           ← el catálogo que consume el navegador
│   ├── page.js               ← HTML de la ficha con meta y datos estructurados
│   ├── shop.js               ← HTML de /tienda y /tienda/:categoria
│   └── sitemap.js            ← sitemap.xml generado del catálogo
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── context/
    │   └── CartContext.jsx   ← carrito global, persistido en localStorage
    ├── lib/
    │   └── track.js          ← eventos de analítica
    ├── hooks/
    │   ├── useProducts.js    ← store compartido; pide /api/products
    │   └── useRoute.js       ← router sobre la History API
    └── components/
        ├── Navbar.jsx
        ├── Hero.jsx
        ├── FeaturedProducts.jsx
        ├── Catalog.jsx
        ├── ProductCard.jsx
        ├── ProductPage.jsx
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
lee únicamente el servidor**, en `api/_catalog.js`, desde la variable de entorno
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

## Direcciones y SEO

Cada pieza tiene su propia dirección: `/producto/mini-silver-argolla-10mm`. El
slug sale del nombre más la subcategoría y **es estable**: si cambia, se pierde
el posicionamiento y los links que ya circulan. Si dos piezas coinciden, desempata
el código del Sheet.

WhatsApp, Instagram y el robot de Google no ejecutan JavaScript, así que las
etiquetas no pueden escribirse desde React. `api/page.js` devuelve el HTML con el
`<title>`, las meta de compartir y el JSON-LD ya puestos, y recién después React
toma el control en el navegador.

| Dirección | Qué la sirve |
|---|---|
| `/producto/:slug` | `api/page.js` — meta propias + `Product` y `BreadcrumbList` |
| `/tienda` | `api/shop.js` — catálogo completo + `ItemList` |
| `/tienda/:categoria` | `api/shop.js` — una página indexable por categoría |
| `/sitemap.xml` | `api/sitemap.js` — piezas y categorías con stock |
| `/robots.txt` | estático, en `public/` |
| `/cuidados`, `/cambios`, `/contacto` | la home, con scroll a la sección |
| todo lo demás | `index.html` (la SPA) |

Los filtros de material, orden y búsqueda van en la query
(`/tienda/argollas?material=Plata&orden=menor`): se pueden compartir y el botón
atrás los recorre. La categoría va en la ruta porque es la que interesa indexar
— "argollas de plata" es una búsqueda real.

Las piezas sin stock desaparecen del catálogo, del sitemap y devuelven 404 con
`noindex`.

Si el sitio cambia de dominio, actualizá la variable `SITE_URL` (por defecto
`https://www.lunareacc.com`) y la línea `Sitemap:` de `public/robots.txt`.

## Funcionalidades

- ✅ **Una dirección por pieza y por categoría**, indexable y compartible
- ✅ **Filtros en la URL** — una vista filtrada se comparte y vuelve con el botón atrás
- ✅ **Catálogo filtrable** por categoría y material, con búsqueda por nombre
- ✅ **Carrito lateral** con control de cantidades y tope por stock
- ✅ **Carrito persistente** — sobrevive al refresh 7 días (localStorage) y se
  reconcilia con los precios y el stock del día al volver
- ✅ **Checkout por WhatsApp** con mensaje prearmado
- ✅ **Precio costo fuera del navegador** — ver la advertencia de arriba
- ✅ **Solo productos en stock** — sin stock = no aparecen
- ✅ **Responsive** — mobile, tablet, desktop
- ✅ **Secciones**: Inicio, Tienda, Contacto, Cuidados, Políticas

## Modo mantenimiento

`middleware.js` puede poner una cortina sobre todo el sitio —páginas, assets
y `/api`— para que una clienta no vea la tienda a medio hacer. Se prende y se
apaga desde Vercel, sin tocar código ni desplegar:

| Variable | Efecto |
|---|---|
| `MANTENIMIENTO=1` | Cortina puesta |
| `MANTENIMIENTO=0` o sin definir | Tienda abierta (por defecto) |
| `MANTENIMIENTO_PASSWORD` | La clave para entrar igual |

Para entrar mientras está puesta: `https://www.lunareacc.com/?clave=LA_CLAVE`.
Queda una cookie de 7 días y se navega normal. La clave se guarda hasheada, no
en texto plano.

La cortina devuelve **503** y no 404, que es lo que le dice a Google que es algo
temporal y que no desindexe las páginas.

> ⚠️ **Es una cortina, no seguridad.** Sirve para que no entre una clienta, no
> para proteger nada sensible. Quien tenga la clave entra, y la primera vez
> viaja en la URL, así que queda en el historial del navegador y en los logs.
> La clave va en una variable de entorno: **nunca en el repo**, que es público.

Si `MANTENIMIENTO=1` está puesto pero falta la clave, la cortina se pone igual.
Es preferible a dejar la tienda abierta por un descuido de configuración.

## Analítica

Además de las visitas que ya medía Vercel, `src/lib/track.js` manda cuatro
eventos de negocio: `producto_visto`, `agregar_al_carrito`, `busqueda` y
`checkout_whatsapp`. Sin ellos no había forma de saber cuál de las 103 piezas
vende ni en qué paso se cae la compra. No se manda ningún dato personal: solo
código de pieza, nombre, categoría y monto.

## Checkout por WhatsApp

Al finalizar la compra se genera un mensaje automático con la lista de
productos, cantidades, precios unitarios y el total.

Número configurado: `+54 2954-476558` (`src/components/CartSidebar.jsx`).

## Personalización

- **Productos**: se editan en el Google Sheet, no en el código.
- **Colores y tipografías**: `tailwind.config.js`.
- **Normalización de categorías, materiales y nombres**: `api/_catalog.js`.
