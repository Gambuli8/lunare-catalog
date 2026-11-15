import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseCSV,
  slugify,
  normalizeCategory,
  normalizeMaterial,
  correctName,
  rowToProduct,
} from '../src/hooks/useProducts.js'

// ── parseCSV ──────────────────────────────────────────────────
test('parseCSV: parsea filas simples a objetos por header', () => {
  const rows = parseCSV('Id,Nombre\n1,Basic Gold\n2,Mini Silver')
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], { Id: '1', Nombre: 'Basic Gold' })
  assert.equal(rows[1].Nombre, 'Mini Silver')
})

test('parseCSV: respeta comas dentro de celdas entre comillas', () => {
  const rows = parseCSV('Id,Nombre\n1,"Nudo, con coma"')
  assert.equal(rows[0].Nombre, 'Nudo, con coma')
})

test('parseCSV: convierte comillas escapadas ("") en una comilla', () => {
  const rows = parseCSV('Id,Nombre\n1,"Con ""comillas"" adentro"')
  assert.equal(rows[0].Nombre, 'Con "comillas" adentro')
})

test('parseCSV: soporta saltos de linea dentro de una celda', () => {
  const rows = parseCSV('Id,Nombre\n1,"Primera\nSegunda",\n2,Otro')
  // El salto interno NO debe partir la fila
  assert.equal(rows.length, 2)
  assert.equal(rows[0].Nombre, 'Primera\nSegunda')
  assert.equal(rows[1].Nombre, 'Otro')
})

test('parseCSV: ignora filas totalmente vacias y CRLF', () => {
  const rows = parseCSV('Id,Nombre\r\n1,A\r\n\r\n2,B\r\n')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].Nombre, 'A')
  assert.equal(rows[1].Nombre, 'B')
})

test('parseCSV: devuelve [] si no hay filas de datos', () => {
  assert.deepEqual(parseCSV('Id,Nombre'), [])
  assert.deepEqual(parseCSV(''), [])
})

// ── slugify ───────────────────────────────────────────────────
test('slugify: minusculas, sin acentos, separado por guiones', () => {
  assert.equal(slugify('Susano Ámbar'), 'susano-ambar')
  assert.equal(slugify('  Tourbillón  '), 'tourbillon')
  assert.equal(slugify('Pop Love Violeta'), 'pop-love-violeta')
})

test('slugify: colapsa simbolos y recorta guiones de los bordes', () => {
  assert.equal(slugify('¡Hola!! Mundo--'), 'hola-mundo')
  assert.equal(slugify(''), '')
})

// ── normalizeCategory ─────────────────────────────────────────
test('normalizeCategory: mapea sinonimos a la categoria canonica', () => {
  assert.equal(normalizeCategory('argolla'), 'Argolla')
  assert.equal(normalizeCategory('collar'), 'Collar')
  assert.equal(normalizeCategory('conjunto'), 'Collar')
  assert.equal(normalizeCategory('tennis'), 'Pulsera')
  assert.equal(normalizeCategory('cuffs'), 'Cuff')
})

test('normalizeCategory: vacio -> Otros; desconocido -> Title Case', () => {
  assert.equal(normalizeCategory(''), 'Otros')
  assert.equal(normalizeCategory('tobillera'), 'Tobillera')
})

// ── normalizeMaterial ─────────────────────────────────────────
test('normalizeMaterial: canoniza materiales conocidos', () => {
  assert.equal(normalizeMaterial('plata'), 'Plata')
  assert.equal(normalizeMaterial('oro'), 'Plata Dorada')
  assert.equal(normalizeMaterial('plata dorada'), 'Plata Dorada')
  assert.equal(normalizeMaterial('acero'), 'Acero Blanco')
  assert.equal(normalizeMaterial('acero blanco'), 'Acero Blanco')
})

test('normalizeMaterial: desconocido -> Bijou', () => {
  assert.equal(normalizeMaterial('resina'), 'Bijou')
  assert.equal(normalizeMaterial(''), 'Bijou')
})

// ── correctName ───────────────────────────────────────────────
test('correctName: aplica correcciones conocidas sin importar acentos/caso', () => {
  assert.equal(correctName('basic gold'), 'Basic Gold')
  assert.equal(correctName('TOURBILLON'), 'Tourbillón')
  assert.equal(correctName('susano ambar'), 'Susano Ámbar')
})

test('correctName: desconocido -> Title Case', () => {
  assert.equal(correctName('collar luna nueva'), 'Collar Luna Nueva')
})

// ── rowToProduct ──────────────────────────────────────────────
const baseRow = {
  Id: 'A1',
  Nombre: 'basic gold',
  Categoría: 'argolla',
  Material: 'plata',
  'Precio costo': '3000',
  'Precio individual': '5000',
  Stock: '4',
  Imagen: 'https://res.cloudinary.com/demo/image/upload/x.jpg',
}

test('rowToProduct: NUNCA expone el precio costo', () => {
  const p = rowToProduct(baseRow)
  assert.ok(p)
  assert.equal('Precio costo' in p, false)
  assert.equal('cost' in p, false)
  assert.equal(p.price, 5000)
})

test('rowToProduct: descarta productos sin stock', () => {
  assert.equal(rowToProduct({ ...baseRow, Stock: '0' }), null)
  assert.equal(rowToProduct({ ...baseRow, Stock: '' }), null)
})

test('rowToProduct: descarta productos sin precio valido', () => {
  assert.equal(rowToProduct({ ...baseRow, 'Precio individual': '', 'Precio Par': '' }), null)
})

test('rowToProduct: prioriza Precio Par y marca priceNote=par', () => {
  const p = rowToProduct({ ...baseRow, 'Precio Par': '8000' })
  assert.equal(p.price, 8000)
  assert.equal(p.priceNote, 'par')
})

test('rowToProduct: aplica promo solo si es menor al precio', () => {
  const ok = rowToProduct({ ...baseRow, 'Precio promo': '4000' })
  assert.equal(ok.pricePromo, 4000)
  const ignored = rowToProduct({ ...baseRow, 'Precio promo': '6000' })
  assert.equal(ignored.pricePromo, null)
})

test('rowToProduct: deriva un id estable cuando falta el Id', () => {
  const p = rowToProduct({ ...baseRow, Id: '' })
  assert.equal(p.id, 'basic-gold-argolla')
  // Mismo input -> mismo id (no aleatorio)
  const p2 = rowToProduct({ ...baseRow, Id: '' })
  assert.equal(p.id, p2.id)
})
