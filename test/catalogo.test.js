import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseCSV,
  slugify,
  filaAProducto,
  aProductoPublico,
  catalogoDeLaPlanilla,
} from '../api/_catalog.js'

// Una fila como las de la planilla, con todo lo necesario para publicarse.
const fila = (cambios = {}) => ({
  Id: 'A1',
  Nombre: 'basic gold',
  Categoría: 'Collar',
  Material: 'plata',
  'Precio costo': '3000',
  'Precio individual': '5000',
  Stock: '4',
  ...cambios,
})

const CLAVES_DE_COSTO = /costo|cost/i

// ── Leer la planilla ──────────────────────────────────────────
test('parseCSV: arma un objeto por fila con los encabezados', () => {
  const filas = parseCSV('Id,Nombre\n1,Basic Gold\n2,Mini Silver')
  assert.deepEqual(filas, [
    { Id: '1', Nombre: 'Basic Gold' },
    { Id: '2', Nombre: 'Mini Silver' },
  ])
})

test('parseCSV: una coma dentro de una celda no la parte', () => {
  assert.equal(parseCSV('Id,Nombre\n1,"Nudo, con coma"')[0].Nombre, 'Nudo, con coma')
})

test('parseCSV: las comillas dobles ("") quedan como una comilla', () => {
  assert.equal(parseCSV('Id,Nombre\n1,"Con ""comillas"" adentro"')[0].Nombre, 'Con "comillas" adentro')
})

test('parseCSV: un enter dentro de una celda no corta la fila', () => {
  const filas = parseCSV('Id,Nombre\n1,"Primera\nSegunda"\n2,Otro')
  assert.equal(filas.length, 2)
  assert.equal(filas[0].Nombre, 'Primera\nSegunda')
  assert.equal(filas[1].Id, '2')
})

test('parseCSV: soporta CRLF y saltea filas vacías', () => {
  const filas = parseCSV('Id,Nombre\r\n1,A\r\n\r\n,\r\n2,B\r\n')
  assert.deepEqual(filas.map(f => f.Nombre), ['A', 'B'])
})

test('parseCSV: sin filas de datos devuelve []', () => {
  assert.deepEqual(parseCSV('Id,Nombre'), [])
  assert.deepEqual(parseCSV(''), [])
})

// ── Direcciones de las piezas ─────────────────────────────────
test('slugify: sin acentos, en minúscula y con guiones', () => {
  assert.equal(slugify('Susano Ámbar'), 'susano-ambar')
  assert.equal(slugify('  ¡Tourbillón!  '), 'tourbillon')
})

test('slugify: no pasa de 70 caracteres', () => {
  assert.ok(slugify('a'.repeat(100)).length <= 70)
})

// ── De la fila de la planilla a la pieza ──────────────────────
test('filaAProducto: el costo nunca entra en la pieza', () => {
  const pieza = filaAProducto(fila())
  assert.ok(pieza)
  for (const clave of Object.keys(pieza)) {
    assert.doesNotMatch(clave, CLAVES_DE_COSTO, `la pieza trae "${clave}"`)
  }
  assert.ok(!Object.values(pieza).includes(3000), 'el valor del costo aparece en la pieza')
})

test('filaAProducto: sin Id no se publica (no se podría pedir)', () => {
  assert.equal(filaAProducto(fila({ Id: '' })), null)
  assert.equal(filaAProducto(fila({ Id: '   ' })), null)
})

test('filaAProducto: sin precio no se publica', () => {
  assert.equal(filaAProducto(fila({ 'Precio individual': '', 'Precio Par': '' })), null)
})

test('filaAProducto: lo que va por unidad usa el precio individual', () => {
  const pieza = filaAProducto(fila())
  assert.equal(pieza.price, 5000)
  assert.equal(pieza.priceNote, 'und')
})

test('filaAProducto: los aritos usan solo el precio par, nunca el individual', () => {
  const argolla = filaAProducto(fila({ Categoría: 'Argolla', 'Precio Par': '8000' }))
  assert.equal(argolla.price, 8000)
  assert.equal(argolla.priceNote, 'par')
  // Con solo el individual cargado no se publica: se cobraría un par al precio de uno.
  assert.equal(filaAProducto(fila({ Categoría: 'Argolla', 'Precio Par': '' })), null)
})

test('filaAProducto: la promo solo cuenta si es menor al precio', () => {
  assert.equal(filaAProducto(fila({ 'Precio promo': '4000' })).pricePromo, 4000)
  assert.equal(filaAProducto(fila({ 'Precio promo': '6000' })).pricePromo, null)
})

test('filaAProducto: sin nombre usa la categoría y el código', () => {
  const pieza = filaAProducto(fila({ Nombre: '', Id: 'P7' }))
  assert.match(pieza.name, /P7$/)
})

test('filaAProducto: el stock negativo queda en 0', () => {
  assert.equal(filaAProducto(fila({ Stock: '-2' })).stock, 0)
})

// ── Lo que sale de la base hacia la tienda ────────────────────
test('aProductoPublico: el precio de costo de la base no llega a la tienda', () => {
  const pieza = aProductoPublico({
    id: 'A1', nombre: 'Basic Gold', categoria: 'Collar', material: 'Plata',
    precio: 5000, precio_costo: 3000, stock: 2, fotos: [], slug: 'basic-gold',
  })
  for (const clave of Object.keys(pieza)) {
    assert.doesNotMatch(clave, CLAVES_DE_COSTO, `la pieza trae "${clave}"`)
  }
  assert.ok(!Object.values(pieza).includes(3000), 'el valor del costo aparece en la pieza')
})

// ── El catálogo armado desde la planilla ──────────────────────
test('catalogoDeLaPlanilla: deja afuera lo que no tiene stock', async () => {
  const catalogo = await catalogoDeLaPlanilla([
    fila({ Id: 'A1', Stock: '3' }),
    fila({ Id: 'A2', Nombre: 'mini silver', Stock: '0' }),
  ])
  assert.deepEqual(catalogo.map(p => p.id), ['A1'])
})

test('catalogoDeLaPlanilla: dos piezas con el mismo nombre no comparten dirección', async () => {
  const catalogo = await catalogoDeLaPlanilla([
    fila({ Id: 'A1' }),
    fila({ Id: 'A2' }),
  ])
  const slugs = catalogo.map(p => p.slug)
  assert.equal(new Set(slugs).size, 2)
  // La primera se queda con la dirección limpia, para no romper links ya publicados.
  assert.equal(slugs[0], slugify('basic gold Collar'))
})
