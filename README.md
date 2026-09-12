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
│   ├── pagina.js             ← HTML de /cuidados, /cambios y /contacto
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
        ├── Categories.jsx
        ├── Trust.jsx
        ├── Icon.jsx
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
| `/cuidados`, `/cambios`, `/contacto` | `api/pagina.js` — cada una con su canonical; contacto suma `FAQPage` |
| `/sitemap.xml` | `api/sitemap.js` — piezas y categorías con stock |
| `/robots.txt` | estático, en `public/` |
| todo lo demás | `index.html` (la SPA) |

Cuidados, cambios y contacto eran anclas de la home: las tres devolvían el mismo
HTML con el canonical apuntando a `/`, así que Google las trataba como
duplicados aunque estuvieran en el sitemap. Ahora son páginas propias.

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

## Estructura de las páginas

La home era de casi 12.000 px en el celular: tenía el catálogo entero embebido,
más cuidados y políticas. Como la mayoría del tráfico entra desde Instagram al
celular, eso son casi 15 pantallas de scroll.

Ahora la home es portada, categorías, destacados, confianza y un cierre hacia la
tienda — 4.145 px, 5 pantallas. El catálogo vive en `/tienda` y cada sección
larga tiene su propia dirección, que además es indexable por separado.

## Pedidos y pagos

Los pedidos se guardan en Supabase (proyecto `lunare-tienda`). Hasta ahora un
pedido solo existía como un chat de WhatsApp; con pago online hace falta
registro: qué se compró, a qué precio, en qué estado.

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

**Sin esas variables el checkout no aparece** y el carrito sigue terminando en
WhatsApp, igual que antes. `/api/pedido` devuelve 503 y nada más se rompe.

⚠️ La *service role key* saltea RLS: va solo en Vercel, nunca en el repo, que es
público.

### Lo que protege

**Los precios los pone el servidor.** El navegador manda únicamente qué piezas y
cuántas. `api/pedido.js` busca cada pieza en el catálogo y usa *ese* precio y
*ese* stock. Si no fuera así, alcanzaría con editar el JSON del pedido para
comprarse una pieza a $1.

**El stock se valida dentro de una transacción.** El stock real vive en la
planilla, que no sabe de transacciones: dos personas podían comprar la última
pieza al mismo tiempo y las dos recibían confirmación. La función
`crear_pedido()` toma un lock, le resta a lo que dice la planilla las unidades
ya comprometidas por pedidos vivos (`stock_comprometido`) y recién ahí inserta.
Si falta algo, devuelve qué pieza y cuánto queda.

**El precio queda congelado** en `pedido_items`: el del Sheet cambia y un pedido
viejo tiene que seguir diciendo lo que se cobró ese día.

**Las tablas no son accesibles desde el navegador.** RLS prendido sin políticas y
permisos revocados de `anon`; solo las funciones del servidor entran, con la
service role key.

### Estados

`pendiente` → `pagado` → `despachado` → `entregado`, más `cancelado`. Solo
`pendiente` y `pagado` comprometen stock.

## Avisos de pedidos

Guardar el pedido no alcanza: si nadie mira la base, la venta se pierde igual.
`api/_aviso.js` manda dos mails por [Resend](https://resend.com) apenas se crea
el pedido.

```
RESEND_API_KEY=...
AVISO_EMAIL_DESTINO=hola@lunareacc.com        # o varias, separadas por coma
AVISO_EMAIL_FROM=Lunare Accesorios <pedidos@lunareacc.com>   # opcional
```

**A Lunare**: número, total, teléfono con botón de WhatsApp ya armado, forma de
entrega y de pago, notas, y las piezas con miniatura y código para encontrarlas
en la planilla. El *reply-to* es el mail de la clienta, así responder el aviso
le escribe a ella. Cierra recordando que el stock del Sheet se descuenta a mano.

**A la clienta**, solo si dejó correo —el campo es opcional—: su número de
pedido, qué compró, el total y qué sigue según cómo eligió pagar.

**Nunca rompen la compra.** Para cuando se manda el mail el pedido ya está en la
base. Sale con `waitUntil()`, después de responderle al navegador, y cada mail va
por separado: si uno falla queda en los logs de Vercel y el otro se manda igual.
Sin `RESEND_API_KEY` no se manda nada y el checkout funciona como siempre.

⚠️ El dominio del remitente tiene que estar verificado en Resend (registros DNS)
o los mails se van a spam.

## Mercado Pago

Checkout Pro. La preferencia se arma en el servidor con los precios que ya
validó `api/pedido.js`, y la clienta se va redirigida a Mercado Pago.

```
MP_ACCESS_TOKEN=APP_USR-...      # o TEST-... para probar
MP_WEBHOOK_SECRET=...            # Tus integraciones > Webhooks
```

**Sin estas variables no se rompe nada**: el pedido se guarda igual, el checkout
cae en la pantalla de siempre y el cobro se coordina a mano.

El *Public Key* no se usa. En Checkout Pro no hay nada que tokenizar en el
navegador.

### El pedido pasa a pagado solo por el webhook

La vuelta del navegador (`/pago?estado=exito`) **no decide nada**: cualquiera
puede escribir esa URL a mano. Es una pantalla de cortesía.

Lo que decide es `api/mp-webhook.js`, y hace tres cosas antes de tocar el pedido:

1. **Verifica la firma.** Mercado Pago manda `x-signature: ts=...,v1=...` y el
   `v1` es un HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
   con la clave secreta de la aplicación. Sin esto, cualquiera que sepa la URL
   manda un POST y se lleva las piezas sin pagar. Sin `MP_WEBHOOK_SECRET` el
   endpoint devuelve 503 antes que creerle a nadie.
2. **No le cree al cuerpo de la notificación** más allá del id: el estado y el
   monto se los pregunta a la API de Mercado Pago.
3. **Compara el monto** contra el total del pedido. Si no cierra, no lo marca
   pagado y queda para mirar a mano.

Es idempotente: Mercado Pago manda varios eventos por el mismo pago y reintenta
si no le contestamos 200. `marcar_pedido_pagado()` solo mueve pedidos en
`pendiente` —un webhook atrasado no pisa uno ya despachado— y el mail de "pago
cobrado" sale una sola vez.

### El webhook no pasa por la cortina

`middleware.js` tapaba todo con 503, incluido `/api`. Con la cortina puesta,
Mercado Pago se comía el 503, reintentaba un rato y se rendía: el pedido quedaba
en `pendiente` para siempre aunque la clienta hubiera pagado.

`/api/mp-webhook` está en `SIEMPRE_ABIERTAS`. No es una puerta abierta: verifica
la firma de cada notificación y sin ella no toca nada.

### Configurar el webhook

En Tus integraciones → la aplicación → **Webhooks**, la URL es
`https://www.lunareacc.com/api/mp-webhook` y el evento es **Pagos**. Ahí mismo
se revela la clave secreta que va en `MP_WEBHOOK_SECRET`.

### Pendiente

- **Salir a producción**: hoy con `TEST-` se cobra plata ficticia. El token
  productivo tiene que salir de la cuenta de Mercado Pago que va a recibir el
  dinero, y hay que rehacer el webhook con el secreto de esa aplicación.
- **La preferencia vence a las 24 h.** Si no paga, el pedido queda en
  `pendiente` reteniendo stock hasta que alguien lo cancele desde el panel.

## Panel de pedidos

`/panel` es la pantalla para mirar los pedidos y moverlos de estado. Antes solo
se veían consultando la base.

```
PANEL_PASSWORD=una-clave-larga-de-verdad
```

Muestra los pedidos con sus piezas, el teléfono ya armado como link de WhatsApp,
la dirección cuando es envío y las notas de la clienta; se filtra por estado y
tiene una segunda pestaña con los arrepentimientos. Arriba, cuántos hay
pendientes y pagados y cuánto se cobró.

Cambiar un estado tiene efecto real sobre el stock: solo `pendiente` y `pagado`
lo comprometen, así que cancelar un pedido libera las piezas para que se puedan
volver a vender.

### Cómo se protege

Una sola clave compartida, sin usuarios: del otro lado hay una persona.

- **La clave nunca viaja en la URL**, solo por POST. La cortina de mantenimiento
  sí la acepta por query string, y por eso está documentada como cortina y no
  como seguridad; acá hay nombres, teléfonos y direcciones de las clientas.
- **La cookie no guarda la clave** sino su hash, es `HttpOnly` y `SameSite=Strict`,
  y dura 12 horas.
- **Mínimo 16 caracteres**, y el panel se niega a arrancar con menos. Contra un
  endpoint serverless no hay mucho más que se pueda hacer sin agregar estado;
  que adivinarla sea inviable es la defensa.
- **Comparación de tiempo constante** y una espera de 700 ms antes de contestar
  que la clave está mal.
- `noindex` por cabecera, `Disallow` en `robots.txt` y sin analítica.

⚠️ Que no sea la misma clave que `MANTENIMIENTO_PASSWORD`.

## Botón de arrepentimiento

Vender online en Argentina obliga a tener publicado un link llamado
**BOTÓN DE ARREPENTIMIENTO**, de acceso fácil y directo desde la home y en un
lugar destacado (Resolución 424/2020 de la Secretaría de Comercio Interior). Va
en el footer, aparte de la fila de links y con borde, para que se vea.

La norma prohíbe pedir registración previa o cualquier trámite extra, así que
`/arrepentimiento` no tiene login y el número de pedido es opcional: alcanza con
nombre y correo.

### El código sale en el acto

La norma da 24 horas para entregarle a la clienta un código de identificación del
trámite. Como lo genera la base en el insert (`ARR-1000`, `ARR-1001`…), se lo
mostramos en pantalla al enviar el formulario y se lo mandamos por mail. El plazo
deja de depender de que alguien conteste a tiempo.

`crear_arrepentimiento()` engancha el pedido si el número existe —normalizando
mayúsculas y espacios— y lo guarda igual si no, porque no es un requisito. La
tabla usa el mismo criterio que `pedidos`: RLS prendido sin políticas y `EXECUTE`
revocado, incluido el que Postgres le da a `PUBLIC` por defecto.

### Datos fiscales

Van en `src/lib/fiscal.js`, que es lo único que hay que tocar:

| Constante | Qué es |
|---|---|
| `RAZON_SOCIAL` | El nombre con el que factura |
| `CUIT` | El CUIT |
| `DOMICILIO` | Domicilio fiscal |
| `DATA_FISCAL_URL` | El link de `qr.afip.gob.ar` que da el Formulario 960/D en ARCA |

⚠️ **Están vacíos.** Mientras lo estén el footer no muestra el bloque —es
preferible a publicar un CUIT equivocado— pero el sitio no debería salir de la
cortina así. Los valores los confirma el contador.

⚠️ Esto implementa el mecanismo, no reemplaza asesoramiento legal. Ver también
"Pendiente": el texto de `/cambios` hoy contradice esta página.

### Pendiente

- **Mercado Pago**: falta el access token. El checkout ya ofrece la opción y
  registra el pedido; el cobro se coordina a mano hasta conectarlo.
- **Tarifas de envío**: las de `api/_pedidos.js` son provisorias, a la espera de
  la API del correo que las calcula por código postal y peso.
- **Descuento de stock en la planilla**: sigue siendo manual. La base evita
  vender de más, pero no edita el Sheet.
- **El texto de `/cambios` contradice a `/arrepentimiento`**: dice "no
  realizamos devoluciones" y "los productos NO tienen garantía". Para una compra
  online las dos cosas van contra la Ley 24.240 —el derecho a arrepentirse no se
  puede renunciar (art. 34) y la garantía legal es de 6 meses (arts. 11 a 18)—,
  así que esas cláusulas no se sostienen. Hay que reescribir la página; el texto
  lo tiene que aprobar quien los asesore.
- **Datos fiscales**: `src/lib/fiscal.js` está vacío. Ver "Botón de
  arrepentimiento".
- **El panel no pagina**: trae los últimos 60 pedidos y listo. Sobra por ahora;
  cuando no alcance, `listar_pedidos()` ya acepta un límite.
- **El botón de agregar de la ficha cae en y=926**, con el fold del celular en
  812: hay que scrollear para comprar. Lo normal en e-commerce es una barra fija
  abajo con el precio y el botón. Sin resolver.

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
