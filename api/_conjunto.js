// ── Conjuntos: dije + cadena ──────────────────────────────────
// La clienta elige un dije y la web le ofrece sumarle una cadena a
// precio de conjunto, o al revés.
//
// Qué pieza es qué:
//   dije    -> la categoría es "Dije"
//   cadena  -> tiene "Precio conjunto" cargado en el Sheet
//
// Que la celda tenga un número es lo que convierte a una pieza en cadena
// de conjunto. Así la dueña maneja todo desde la planilla, sin pedir
// cambios de código, y son cuatro celdas y no las veintiocho
// combinaciones de siete dijes por cuatro cadenas.
//
// La regla: una cadena en promo por cada dije. Dos dijes y dos cadenas,
// las dos en promo; dos cadenas y un dije, una sola.
//
// Está duplicada en src/lib/conjunto.js, que la usa el carrito para
// mostrar los precios. Son treinta líneas; compartirlas entre el
// servidor y el navegador costaría más que repetirlas. Lo que se cobra
// lo decide siempre esta copia, del lado del servidor.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

export const precioBase = p => p?.pricePromo ?? p?.price ?? 0

export const esDije = p => p?.category === 'Dije'

export const esCadenaDeConjunto = p =>
  Number.isFinite(p?.priceCombo) && p.priceCombo > 0

// Recibe las líneas del pedido con su pieza del catálogo y devuelve, para
// cada una, qué precio unitario le toca.
//
// lineas: [{ producto, cantidad }]
export function aplicarConjunto(lineas) {
  // Cada unidad de dije habilita una cadena a precio de conjunto.
  let cupos = lineas
    .filter(l => esDije(l.producto))
    .reduce((n, l) => n + l.cantidad, 0)

  const enConjunto = new Set()

  if (cupos > 0) {
    // De menor a mayor cantidad: así entran más líneas en promo. Una
    // línea entra entera o no entra: partirla en dos precios obligaría a
    // mandar el mismo producto dos veces en el pedido, y el control de
    // stock los contaría por separado.
    const cadenas = lineas
      .filter(l => esCadenaDeConjunto(l.producto))
      .sort((a, b) => a.cantidad - b.cantidad)

    for (const linea of cadenas) {
      if (linea.cantidad > cupos) continue
      enConjunto.add(linea.producto.id)
      cupos -= linea.cantidad
    }
  }

  return lineas.map(linea => {
    const conjunto = enConjunto.has(linea.producto?.id)
    return {
      ...linea,
      precio: conjunto ? linea.producto.priceCombo : precioBase(linea.producto),
      enConjunto: conjunto,
    }
  })
}

// Cuánto se ahorra, para poder decírselo a la clienta.
export function ahorroDelConjunto(lineas) {
  return aplicarConjunto(lineas).reduce(
    (total, l) => total + (l.enConjunto ? (precioBase(l.producto) - l.precio) * l.cantidad : 0),
    0
  )
}
