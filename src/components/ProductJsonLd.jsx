// ── ProductJsonLd ─────────────────────────────────────────────
// Inyecta datos estructurados schema.org (ItemList de Product) para que
// Google muestre precio, imagen y disponibilidad en los resultados.
// No renderiza nada visible.

const SITE_URL = 'https://www.lunareacc.com/'

export default function ProductJsonLd({ products = [] }) {
  if (!products.length) return null

  const itemListElement = products.map((p, i) => {
    const price = p.pricePromo ?? p.price
    const item = {
      '@type': 'Product',
      name: p.name,
      category: p.category,
      ...(p.image ? { image: p.image } : {}),
      ...(p.material ? { material: p.material } : {}),
      offers: {
        '@type': 'Offer',
        price: String(price),
        priceCurrency: 'ARS',
        availability: p.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: SITE_URL,
      },
    }
    return { '@type': 'ListItem', position: i + 1, item }
  })

  const json = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Catálogo Lunare Accesorios',
    itemListElement,
  }

  return (
    <script
      type='application/ld+json'
      // El contenido es JSON generado por nosotros, no entrada de usuario.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
