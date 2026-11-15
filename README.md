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
├── vite.config.js         ← incluye el middleware que sirve /api en dev
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── package-lock.json      ← de acá se instalan las dependencias
├── .env.example
├── vercel.json            ← reescrituras: /producto/:slug, /tienda, /sitemap.xml
├── middleware.js          ← modo mantenimiento (corre antes que todo)
├── public/
│   └── robots.txt
├── api/                   ← los que empiezan con "_" no son endpoints
│   ├── _catalog.js          ← el catálogo desde la base; la planilla, solo para importar
│   ├── _productos.js        ← el catálogo en el panel: validar, guardar, importar, fotos
│   ├── _conjunto.js         ← precio de dije + cadena; lo que se cobra
│   ├── _pedidos.js          ← entregas, pagos y validación de los ítems
│   ├── _envios.js           ← tarifas por CP, de otra pestaña del Sheet
│   ├── _andreani.js         ← cotización en vivo de Andreani
│   ├── _micorreo.js         ← cotización en vivo de Correo Argentino
│   ├── _mp.js               ← preferencias de Mercado Pago y firma del webhook
│   ├── _supabase.js         ← habla con la base con la service role key
│   ├── _aviso.js            ← mails de pedido nuevo y de despacho
│   ├── _panel.js            ← clave y cookie de sesión del panel
│   ├── _html.js             ← utilidades del prerender
│   ├── products.js          ← el catálogo que consume el navegador
│   ├── page.js              ← HTML de la ficha, con meta y datos estructurados
│   ├── shop.js              ← HTML de /tienda y /tienda/:categoria
│   ├── pagina.js            ← HTML de /cuidados, /cambios y /contacto
│   ├── sitemap.js           ← sitemap.xml generado del catálogo
│   ├── pedido.js            ← POST crea el pedido; GET ?id= dice si sigue esperando el pago
│   ├── envio.js             ← opciones de envío de un CP, con el precio final
│   ├── mp-webhook.js        ← donde Mercado Pago avisa que se pagó
│   ├── cron-vencidos.js     ← cancela los pedidos de Mercado Pago que nadie pagó
│   └── panel.js             ← todo el panel: sesión, pedidos y catálogo
├── supabase/
│   └── migrations/          ← el SQL de la base
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── image/
    │   └── logo.jpeg
    ├── context/
    │   └── CartContext.jsx     ← carrito global, persistido en localStorage
    ├── lib/
    │   ├── conjunto.js         ← copia navegador de api/_conjunto.js
    │   ├── envios.js           ← copia navegador de api/_envios.js
    │   ├── fiscal.js           ← datos fiscales que la ley pide mostrar
    │   ├── pagoPendiente.js    ← recuerda el pedido de quien volvió sin pagar
    │   └── track.js            ← eventos de analítica
    ├── hooks/
    │   ├── useProducts.js      ← store compartido; pide /api/products
    │   └── useRoute.js         ← router sobre la History API
    └── components/
        ├── Navbar.jsx
        ├── Hero.jsx
        ├── Categories.jsx
        ├── Trust.jsx
        ├── Icon.jsx            ← íconos de trazo, en una sola familia
        ├── FeaturedProducts.jsx
        ├── Catalog.jsx         ← la tienda, con buscador y filtros
        ├── ProductCard.jsx
        ├── ProductPage.jsx     ← la ficha: galería, conjuntos y barra de compra
        ├── CloudinaryImage.jsx
        ├── CartSidebar.jsx     ← el carrito y el checkout en tres pasos
        ├── Copiable.jsx        ← copiar un código de un toque
        ├── Pago.jsx            ← la vuelta de Mercado Pago
        ├── PagoPendiente.jsx   ← aviso a quien volvió sin pagar
        ├── Panel.jsx           ← el panel: pedidos y arrepentimientos
        ├── PanelProductos.jsx  ← el panel: el catálogo
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

## Catálogo en el panel

**El catálogo vive en Supabase (tabla `productos`) y se maneja solo desde
`/panel` → Productos.** La planilla quedó únicamente para la importación
inicial. El SQL está en `supabase/migrations/20261115_catalogo_en_supabase.sql`.

Desde el panel la dueña puede:

- **Ver** todas las piezas, con buscador, filtro por categoría y por estado
  (en venta, sin stock, ocultas).
- **Cambiar el stock** con + y − desde la lista, sin abrir la ficha.
- **Crear y editar**: nombre, código, categoría, medida, material, precio,
  promo, costo (solo lo ve ella), stock, fotos, descripción, precio y foto de
  conjunto, visible y destacada.
- **Subir fotos** desde el celular, que van directo a Cloudinary (ver abajo),
  o pegar el link de una. La primera es la principal y se reordenan con ‹ ›.
- **Ocultar** una pieza sin borrarla, o **borrarla** si nunca estuvo en un
  pedido.
- **Importar desde la planilla** las piezas que falten. Nunca pisa una que ya
  esté cargada, así que se puede correr más de una vez.

### El stock

`stock` es **lo que queda para vender**. Un pedido lo descuenta al crearse,
dentro de la transacción y con la fila bloqueada, y cancelarlo lo devuelve
(trigger `pedidos_stock_segun_estado`). Ya no hay que descontar nada a mano.
Una venta por WhatsApp sí se descuenta a mano, con el − de la lista.

Al guardar desde el panel **se aplica la diferencia**, no el número: si la
dueña abrió la ficha con 3, mientras tanto se vendió una y guarda 5, queda 4.
Así una ficha abierta hace rato no "des-vende" lo que entró en el medio.

### El pase desde la planilla

Mientras la tabla esté vacía la tienda sigue leyendo la planilla, así que se
puede desplegar antes de importar sin dejar la tienda sin productos. Apenas hay
una fila, la planilla no se mira más.

La importación respeta **el slug de cada pieza publicada**: ningún link que ya
esté dando vueltas cambia. Las piezas sin stock entran con stock 0 y quedan en
el panel para reponerlas.

Si la planilla tiene **códigos repetidos**, entra una sola pieza por código (la
que estaba publicada) y el panel avisa cuáles eran. Cuando son dos piezas
distintas con el mismo código, la otra hay que cargarla con "+ Nueva pieza" y
un código nuevo.

### Cuánto tarda en verse un cambio

Hasta un par de minutos: el catálogo se cachea un minuto en memoria y las
páginas uno o dos más en Vercel. Si la base no responde, la tienda sigue
mostrando la última copia que tenía.

### Fotos

```
CLOUDINARY_CLOUD_NAME=dtbasr3hw
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

El navegador sube la foto directo a Cloudinary, a la carpeta
`lunare/productos`, con una firma que da `/api/panel`. El archivo no pasa por
Vercel y el secreto no sale del servidor. Sin estas variables el botón de
subir no aparece y se puede pegar el link de una foto.

## Catálogo y precios (planilla, solo para importar)

Lo que sigue describe la planilla vieja. Sirve para la importación inicial.

El catálogo salía de un Google Sheet publicado como CSV. **La URL del Sheet la
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
Precio Par | Stock | Imagen | Imagen 2 | Imagen 3 | Imagen 4 |
Destacado | Precio promo | Precio conjunto | Imagen conjunto
```

- **Stock ≤ 0** → el producto no aparece.
- **Las fotos de más son opcionales.** Si están, la ficha muestra una galería
  con miniaturas y la tarjeta del catálogo cambia a la segunda foto al pasar el
  mouse. Se reconocen de dos formas, y las dos valen:
  - **Numeradas**: `Imagen 2`, `Imagen 3`, `imagen2`, `Foto 2`, `Image 2`.
  - **Con nombre**, como las llama la guía de fotos: `Imagen Puesto`,
    `Imagen Medida`, `Imagen Detalle`.

  El orden es: la principal, después las numeradas por su número, y al final las
  que tienen nombre en el orden en que estén las columnas en la planilla. Los
  encabezados se leen sin acentos ni mayúsculas, y una foto repetida se ignora.
- **Sin `Id`** → el producto no aparece (el código va en el mensaje de WhatsApp
  y es lo que identifica cada ítem del carrito).
- **`Precio promo`** solo se usa si es menor al precio normal.
- **`Precio conjunto`** es lo que sale **esa cadena** cuando se la lleva junto a
  un dije. Solo se carga en las cadenas, y **tener la celda cargada es lo que
  marca a esa pieza como cadena de conjunto**, aunque el número sea el mismo que
  el de lista: los dijes no se venden solos, así que la cadena tiene que
  aparecer como opción igual. Que además sea menor es lo que le pone el
  descuento. Ver [Conjuntos](#conjuntos-dije--cadena).
- **`Imagen conjunto`** es opcional y va también en la cadena: la foto del dije
  y la cadena puestos juntos, para ofrecer el conjunto con la imagen de lo que
  se lleva. **No entra en la galería de la pieza**, sale solo donde se ofrece el
  conjunto. Sin ella se muestra la foto de la cadena.
- **`Destacado`** acepta `si`, `sí`, `yes`, `1` o `true`.
- **`Categoría`** es lo que se lee debajo del nombre —"Argolla 9mm", "Collar
  gamuza"—, así que se muestra siempre con mayúscula inicial aunque en la
  planilla esté en minúscula, y se le saca la anotación interna `IND`. La
  dirección de la pieza no sale de acá, así que corregir la celda no rompe
  ningún link.
- **`Nombre` vacío** → la pieza se llama por su categoría más el código
  ("Pulsera pa1381/1"). Sin el código, ocho pulseras se llamaban todas
  "Pulsera" y eran imposibles de distinguir en la grilla y en el carrito.
- **Los aritos** —argollas, pasantes y abridores— toman el precio solo de
  `Precio Par`, nunca de `Precio individual`: se venden únicamente de a dos.

El endpoint cachea la respuesta 60 s en el CDN de Vercel y revalida por atrás,
así que una visita nunca espera a Google Sheets.

## Conjuntos: dije + cadena

La clienta se lleva un dije y la cadena le sale más barata. Se ofrece en las dos
direcciones: en la ficha de un dije aparecen las cadenas, y en la de una cadena,
los dijes que le bajan el precio.

**Qué pieza es qué lo decide la planilla, no el código:**

- **Dije** → la categoría es `Dije`.
- **Cadena de conjunto** → tiene `Precio conjunto` cargado.

Que esa celda tenga un número es lo único que convierte a una pieza en cadena de
conjunto. Así son cuatro celdas y no las veintiocho combinaciones de siete dijes
por cuatro cadenas, y la dueña lo maneja desde el Sheet sin pedir cambios de
código. Mientras no haya ninguna cargada, el bloque no aparece en ningún lado.

**Los dijes no se venden solos.** En la ficha de un dije, al tocar "Agregar al
pedido" sale un cuadro para elegir con qué cadena, antes de que el dije entre al
carrito. Cerrar sin elegir cancela: no tendría sentido dejar en el carrito algo
que no se puede comprar así.

La excepción es la red de seguridad: **si ninguna cadena tiene `Precio conjunto`
cargado, el cuadro no aparece y el dije se agrega solo.** Sin esa salida, un
descuido en la planilla dejaría los siete dijes sin poder venderse.

Más abajo en la misma ficha queda el bloque "Armá tu conjunto", que también
funciona al revés: desde una cadena, ofrece los dijes.

Los precios que se muestran son **los de las dos piezas juntas**, no el de la
cadena sola: es lo que la clienta va a pagar.

**La regla: una cadena en promo por cada dije.** Dos dijes y dos cadenas, las dos
en promo; dos cadenas y un solo dije, una sola —la de menor cantidad, así entran
más líneas—. Una línea entra entera o no entra: con un dije y dos unidades de la
*misma* cadena, esa línea no entra en promo. Partirla obligaría a mandar el mismo
producto dos veces en el pedido y el control de stock los contaría por separado,
que es como se vende algo que no está.

**Dónde vive:** en `api/_conjunto.js`, y repetida en `src/lib/conjunto.js` para
que el carrito muestre los precios mientras la clienta arma el pedido. Son
treinta líneas; compartirlas entre el servidor y el navegador costaría más que
repetirlas. **Lo que se cobra lo decide siempre la del servidor**, en
`validarItems`: si las dos se separaran, el peor caso es que el navegador muestre
un precio que el servidor después corrige.

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
- ✅ **Barra de compra fija en el celular** — en la ficha, el botón de agregar
  cae a unos 1.000 px del tope y la pantalla termina en 812: aparece una barra
  abajo con el precio y el botón, y se esconde sola cuando el botón de verdad
  entra en pantalla
- ✅ **Áreas táctiles de 44 px** en todo lo que se toca, medido en 375×812
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

### Antes de ir y al volver sin pagar

En el paso 3, con Mercado Pago elegido, el botón pasa a **Ir a pagar** y un
aviso explica que la llevamos a Mercado Pago y que las piezas quedan reservadas.
Al confirmar, el carrito muestra *Te llevamos a Mercado Pago* con el número del
pedido durante un segundo y medio, en vez de saltar de golpe a otro sitio.

Si vuelve sin pagar —tocó "atrás", dudó, cerró la pestaña— el carrito ya está
vacío, porque el pedido existe. Para que no quede sin rastro,
`src/lib/pagoPendiente.js` guarda en el navegador el id, el número, el total y
el link de pago, y vence a las 24 h junto con la preferencia:

- **Al entrar a la tienda** aparece *Tu pedido te está esperando*
  (`PagoPendiente.jsx`) con tres salidas: terminar el pago, consultar por
  WhatsApp con el número ya escrito, o "Ahora no", que lo calla hasta cerrar el
  navegador. También se dispara con `pageshow`, porque al volver con "atrás"
  el navegador suele restaurar la página congelada sin volver a montar React.
- **En el carrito vacío** aparece *Tenés un pedido esperando el pago*.
- **En `/pago?estado=error`** aparece *Intentar de nuevo* con el mismo link.
- `exito` y `pendiente` lo borran.

Antes de mostrarlo pregunta a `GET /api/pedido?id=<uuid>` si el pedido
sigue pendiente, para no pedirle que pague a alguien que ya pagó. Va por el
uuid y no por el número —que es correlativo y se adivina— y devuelve solo el
número y el estado. Si la consulta falla se muestra igual, con la aclaración de
que si ya pagó no tiene que hacer nada.

> Depende de que el webhook funcione: si nunca marca el pedido como pagado,
> quien pagó y cerró la pestaña antes de volver a la tienda ve el recordatorio.

### Configurar el webhook

En Tus integraciones → la aplicación → **Webhooks**, la URL es
`https://www.lunareacc.com/api/mp-webhook` y el evento es **Pagos**. Ahí mismo
se revela la clave secreta que va en `MP_WEBHOOK_SECRET`.

### Pendiente

- **Salir a producción**: hoy con `TEST-` se cobra plata ficticia. El token
  productivo tiene que salir de la cuenta de Mercado Pago que va a recibir el
  dinero, y hay que rehacer el webhook con el secreto de esa aplicación.

### Pedidos que nadie pagó

La preferencia vence a las 24 h. Una vez por día (`crons` en `vercel.json`,
9:00 UTC = 6:00 en Argentina) `api/cron-vencidos.js` cancela los pedidos de
Mercado Pago que siguen en `pendiente` después de 25 h, y así las piezas vuelven
a estar a la venta.

Antes de cancelar le pregunta a Mercado Pago por los pagos de ese pedido. **No
cancela** si hay uno aprobado (el webhook no llegó: queda en los logs como
error para revisarlo a mano), uno en curso (por ejemplo, un pago en efectivo
en Rapipago) o si Mercado Pago no contesta. Los pedidos por transferencia o en
efectivo no los toca.

```
CRON_SECRET=una-cadena-larga-y-aleatoria
```

Sin `CRON_SECRET` el endpoint devuelve 503 y no hace nada. En el plan Hobby de
Vercel los crons corren una vez por día como máximo; en Pro se puede pasar a
`0 * * * *` (cada hora).

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

### Número de seguimiento

Cuando Lunare despacha, carga en la tarjeta del pedido el transporte y el
número que le dio el correo. Eso hace tres cosas de una:

1. Guarda el número en el pedido (`pedidos.seguimiento`).
2. **Mueve el pedido a despachado**, solo si venía de pendiente o pagado: uno
   ya entregado no vuelve para atrás.
3. Le manda a la clienta un mail con el número bien grande y el botón a la
   página de rastreo del transporte.

Los links de rastreo salen de `linkSeguimiento()`: Andreani, Correo Argentino e
Integral Pack, verificados. Un transporte que no esté en esa lista igual se
guarda y se avisa, solo que sin botón.

Los tres rastreadores son páginas hechas en JavaScript, así que un link con el
número adentro no es confiable: por eso el mail lleva el número para copiar y
el link a la página, y no un link directo que puede romperse.

Si la clienta no dejó correo, el número se guarda igual y el panel avisa que hay
que pasárselo por WhatsApp.

### Cómo se protege

Una sola clave compartida, sin usuarios: del otro lado hay una persona.

- **La clave nunca viaja en la URL**, solo por POST. La cortina de mantenimiento
  sí la acepta por query string, y por eso está documentada como cortina y no
  como seguridad; acá hay nombres, teléfonos y direcciones de las clientas.
- **La cookie no guarda la clave** sino su hash, es `HttpOnly` y `SameSite=Strict`,
  y dura 12 horas.
- **Límite de intentos.** 5 claves mal en 15 minutos desde la misma conexión la
  bloquean hasta que pasen los 15 minutos; 30 en 15 minutos sumando todas las
  conexiones cierran el login para todos (quien ya tiene la sesión abierta sigue
  adentro). Los intentos se cuentan en la tabla `panel_intentos`, con un HMAC de
  la IP y nunca la IP. Sin Supabase no hay cómo contarlos, y el login no acepta
  ninguna clave.
- **Mínimo 10 caracteres**, y el panel se niega a arrancar con menos. Con el
  límite de intentos, 10 caracteres con mayúsculas, minúsculas y números no se
  pueden adivinar probando.
- **Comparación de tiempo constante** y una espera de 700 ms antes de contestar
  que la clave está mal.
- `noindex` por cabecera, `Disallow` en `robots.txt` y sin analítica.

⚠️ Que no sea la misma clave que `MANTENIMIENTO_PASSWORD`.

## Lo legal

⚠️ Esto implementa lo que piden las normas; los textos los tiene que validar
quien asesore al negocio.

### Botón de arrepentimiento

Vender online en Argentina obliga a tener publicado un link llamado
**Botón de arrepentimiento**, de acceso fácil y directo desde la home y en un
lugar destacado (Resolución 424/2020 de la Secretaría de Comercio Interior). Va
en el footer, aparte del resto de los links y con borde, para que se vea.

Se había sacado del sitio a pedido del dueño del proyecto y volvió: es
obligatorio y sin él la tienda queda expuesta a multa.

La norma prohíbe pedir registración previa o cualquier trámite extra, así que
`/arrepentimiento` no tiene login y el número de pedido es opcional: alcanza con
nombre y correo. La norma da 24 horas para entregar un código de identificación
del trámite; lo genera la base en el insert (`ARR-1000`, `ARR-1001`…), así que
sale en pantalla al enviar el formulario y por mail. Las solicitudes se ven en
el panel, pestaña **Arrepentimientos**.

### Cambios, devoluciones y garantía (`/cambios`)

La página decía "no realizamos devoluciones" y "los productos NO tienen
garantía". En una compra online las dos cosas van contra la Ley 24.240: el
derecho a arrepentirse dentro de los 10 días no se puede renunciar (art. 34) y la
garantía legal —6 meses para cosas nuevas— no se puede excluir (art. 11). Ahora
dice eso, y los **cambios** por gusto quedan como política de la tienda, con sus
condiciones (sin aros, 10 días, el envío del cambio lo paga la clienta).

Pendiente de decidir con el asesor: si los aros, por higiene, pueden quedar
fuera del arrepentimiento (el Código Civil y Comercial exceptúa los bienes que
"por su naturaleza no pueden ser devueltos").

### Política de privacidad (`/privacidad`)

La pide la Ley 25.326: la tienda junta nombre, teléfono, correo y dirección.
Dice qué se pide, para qué, con quién se comparte (Mercado Pago, el transporte,
Vercel, Supabase, Resend), cuánto se guarda y cómo pedir acceso, corrección o
borrado, con las dos leyendas textuales de la Disposición 10/2008. Hay link en el
footer y un aviso al lado del botón de confirmar del checkout.

⚠️ Describe lo que el sitio hace hoy. Antes de sumar un servicio que reciba
datos —el píxel de Meta, Google Analytics, una lista de mails— hay que agregarlo
en `src/components/Privacidad.jsx`.

### Datos fiscales

Van en `src/lib/fiscal.js`: `RAZON_SOCIAL`, `CUIT`, `DOMICILIO` y
`DATA_FISCAL_URL` (el link de `qr.afip.gob.ar` que da el Formulario 960/D en
ARCA). **Están vacíos**: mientras lo estén, el footer no muestra el bloque —es
preferible a publicar un CUIT equivocado— y la política de privacidad nombra solo
a "Lunare Accesorios". Los valores los confirma el contador.

## Abrir la tienda en modo WhatsApp

El pedido online se puede apagar sin tocar ninguna clave:

```
CHECKOUT_ONLINE=0    # el carrito termina en WhatsApp
CHECKOUT_ONLINE=1    # o sin definir: checkout completo con Mercado Pago
```

Sirve para abrir la tienda mientras se termina de probar el cobro: la clienta
compra igual, por WhatsApp, con sus piezas ya escritas en el mensaje. La
alternativa --sacar las claves de Supabase-- rompería además el panel y los
avisos por mail, que no tienen nada que ver.

Con el interruptor apagado, el carrito no muestra los tres pasos: muestra el
botón de WhatsApp y el mensaje armado. `/api/pedido` también rechaza pedidos,
así que nadie puede colarse por atrás.

Para prender el cobro online: `CHECKOUT_ONLINE=1` y un deploy.

## Envíos por zona

El precio del envío sale del código postal. La clienta escribe el suyo y ve
**las opciones que le llegan, con el precio de cada transporte**, y elige.

Las tarifas viven en una pestaña del mismo Google Sheet del catálogo, así las
cambia Lunare cuando aumenta el correo, sin tocar código ni esperar un deploy.

```
SHEET_ENVIOS_CSV_URL=...   # la pestaña "Envios", publicada como CSV
```

**Sin esa variable no se rompe nada**: se usa la tarifa plana de antes ($6.800
a domicilio, a todo el país) y la tienda funciona igual.

### La pestaña

Va una fila por transporte y por zona:

| Transporte | Zona | CP desde | CP hasta | Domicilio | Sucursal | Dias |
|------------|------|----------|----------|-----------|----------|------|
| Andreani | Santa Rosa | 6300 | 6399 | 4200 | 3500 | 1 a 2 |
| Correo Argentino | Santa Rosa | 6300 | 6399 | 3900 | 3100 | 2 a 3 |
| Integral Pack | La Pampa | 6200 | 6499 | 3500 | | 1 |
| Andreani | Resto del país | 1000 | 9999 | 12500 | 9900 | 5 a 8 |

- **Gana la fila más específica.** Si un CP entra en dos zonas, para ese
  transporte manda la del rango más chico: una fila para Santa Rosa le gana a la
  del país entero sin tener que ordenar la planilla.
- **Celda vacía** significa que ese transporte no ofrece esa modalidad en esa
  zona, y la opción no se muestra.
- **Dias** es texto libre y solo se muestra ("llega en 2 a 3 días hábiles"; con
  `1` dice "1 día hábil").
- Los encabezados se leen sin acentos ni mayúsculas: `Días`, `dias` o `DIAS` son
  lo mismo.
- Agregar un transporte es agregar filas. No hay que tocar código ni la base.

### Quién decide el precio

La tabla viaja con `/api/products` para que las opciones aparezcan apenas se
escribe el código postal, sin otra consulta. Pero **el que se cobra lo calcula
el servidor** en `resolverEnvio()` al confirmar, y verifica que esa combinación
de transporte y modalidad exista para ese CP. Si no fuera así, alcanzaría con
editar el pedido para elegir el precio del transporte más barato y hacerse
despachar por el más caro.

El envío sigue siendo sin cargo desde `ENVIO_GRATIS_DESDE`.

### Qué se guarda

`pedidos.entrega` dice la modalidad (`envio` a domicilio, `envio_sucursal`) y
`pedidos.transporte` guarda cuál eligió, como texto. Es texto y no un enum
justamente porque los transportes se agregan y se sacan desde el Sheet.

### Andreani en vivo

El cotizador de Andreani ya está conectado, apagado hasta que haya contrato:

```
ANDREANI_CONTRATO_DOMICILIO=...   # envío a domicilio
ANDREANI_CONTRATO_SUCURSAL=...    # envío a sucursal
```

Son dos contratos distintos —Andreani cobra los servicios por separado— y salen
de la cuenta comercial. Con uno cargado, las filas del Sheet cuyo transporte sea
Andreani dejan de usar el precio de la planilla y se cotizan contra la API por
código postal, peso y valor declarado; el resultado se redondea a la centena de
arriba. Sin contrato, o si la API falla o tarda más de 6 segundos, queda el
precio del Sheet: nadie se queda sin poder comprar por esto.

El peso se estima en 150 g de base más 60 g por pieza, en una caja de 10 × 10 ×
10. Para joyería el cobro es por peso aforado mínimo, así que alcanza.

`GET /api/envio?cp=6300&piezas=2&valor=57400` devuelve las opciones ya con el
precio final. El carrito muestra al instante los precios de la tabla y lo llama
en segundo plano para confirmarlos; el que se cobra se recalcula igual al
confirmar el pedido.

El listado de sucursales (`/v2/sucursales`) es público y no necesita contrato:
son 317 sucursales que atienden público, cacheadas 12 horas.

### Correo Argentino en vivo

También conectado y apagado, por la API de **MiCorreo**:

```
MICORREO_USUARIO=...       # las pide Correo, distintas por ambiente
MICORREO_PASSWORD=...
MICORREO_CLIENTE=...       # el customerId de la cuenta de MiCorreo
MICORREO_CP_ORIGEN=6300    # desde dónde se despacha (opcional)
MICORREO_AMBIENTE=test     # apunta al ambiente de pruebas
```

MiCorreo es de **alta abierta**: uno se registra con DNI o CUIT y despacha en
cualquier sucursal, sin acuerdo comercial previo. Las credenciales de la API se
piden por formulario a Correo, y son distintas para test y para producción.

No confundir con **Paq.ar**, la otra API de Correo: esa pide acuerdo comercial
con el área Comercial, y encima no cotiza —da de alta envíos, imprime rótulos y
devuelve el seguimiento—.

Se autentica en dos pasos: `POST /token` con usuario y contraseña devuelve un
JWT que dura un par de horas, y ese token se reusa para cotizar. Pedir uno por
cotización sería duplicar las llamadas.

`POST /rates` **devuelve las dos tarifas en un solo pedido** —a domicilio (`D`)
y a sucursal (`S`)— así que cotizar cuesta una sola llamada. El precio se
redondea a la centena de arriba.

### Cómo conviven las dos APIs

`cotizar()` arma las opciones desde el Sheet y después deja que cada transporte
con credenciales reemplace **solo sus propias filas**. Las dos APIs se llaman en
paralelo: son servicios distintos y esperar una atrás de la otra sería regalar
segundos justo mientras la clienta elige.

Si una falla, tarda o no está configurada, esa fila queda con el precio del
Sheet. Integral Pack no tiene API pública: siempre sale de la tabla.

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
