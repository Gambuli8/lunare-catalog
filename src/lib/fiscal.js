// ── Datos fiscales ────────────────────────────────────────────
// Los que van visibles en el sitio por vender online en Argentina.
// Son públicos a propósito: la ley pide justamente que se vean.
//
// ⚠️ Están vacíos hasta que los confirme el contador. Mientras lo estén,
// el footer no muestra el bloque —es preferible a publicar un CUIT
// equivocado— pero el sitio no debería salir de la cortina así.
//
// El link de Data Fiscal sale de generar el Formulario 960/D en ARCA
// (ex AFIP): te da una dirección de qr.afip.gob.ar propia del CUIT.

export const RAZON_SOCIAL = ''
export const CUIT = ''
export const DOMICILIO = ''
export const DATA_FISCAL_URL = ''

// La imagen oficial del Formulario 960/D. La sirve ARCA y no cambia.
export const DATA_FISCAL_IMG = 'https://www.afip.gob.ar/images/f960/DATAWEB.jpg'

// Formulario nacional de reclamos de Defensa de las y los Consumidores.
export const DEFENSA_CONSUMIDOR_URL =
  'https://autogestion.produccion.gob.ar/consumidores'

export const fiscalCompleto = () => Boolean(RAZON_SOCIAL && CUIT && DOMICILIO)
