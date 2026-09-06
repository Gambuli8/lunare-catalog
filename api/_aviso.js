// ── Avisos por mail ───────────────────────────────────────────
// Un pedido que nadie mira no es una venta. Hasta acá el pedido quedaba
// guardado en Supabase y solo se veía por SQL: la clienta recibía su
// número y del otro lado no se enteraba nadie.
//
// Cuando entra un pedido salen dos mails por Resend: uno a Lunare con
// todo lo necesario para coordinar, y otro a la clienta con lo que
// compró y qué sigue.
//
// Los archivos de api/ que empiezan con "_" no son endpoints.

import { esc } from './_html.js'
import { formatPrice, productImage, SITE_URL } from './_catalog.js'
import { ENTREGAS, PAGOS } from './_pedidos.js'

const API = 'https://api.resend.com/emails'

// El WhatsApp del negocio, el mismo que muestra el carrito.
const WHATSAPP_LUNARE = '542954476558'

const ORO = '#8f7647'
const GRIS = '#5f574e'

const apiKey = () => process.env.RESEND_API_KEY
const remitente = () => process.env.AVISO_EMAIL_FROM || 'Lunare Accesorios <pedidos@lunareacc.com>'

// Puede ser más de una casilla, separadas por coma.
const destino = () => (process.env.AVISO_EMAIL_DESTINO || '')
  .split(',').map(s => s.trim()).filter(Boolean)

export function avisosConfigurados() {
  return Boolean(apiKey() && destino().length)
}

async function enviar({ to, subject, html, texto, responderA }) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      from: remitente(),
      to,
      subject,
      html,
      text: texto,
      ...(responderA ? { reply_to: responderA } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

// ── Formato ───────────────────────────────────────────────────

const fecha = iso => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// wa.me quiere el número sin 0 de área, sin el 15 y con el 54 9 adelante.
// Si no llegamos a armarlo, el mail muestra igual el número escrito para
// copiarlo a mano.
export function waLink(telefono) {
  let d = String(telefono || '').replace(/\D/g, '')
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.startsWith('9')) d = d.slice(1)
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2')
  if (d.length < 8 || d.length > 12) return null
  return `https://wa.me/549${d}`
}

const etiquetaEntrega = k => ENTREGAS[k]?.etiqueta || k
const etiquetaPago = k => PAGOS[k]?.etiqueta || k

// Adónde va el pedido, en una línea.
function lineaEntrega(datos) {
  const base = etiquetaEntrega(datos.entrega)
  if (!ENTREGAS[datos.entrega]?.envio) return base
  const partes = [datos.direccion, datos.cp && `CP ${datos.cp}`].filter(Boolean)
  return partes.length ? `${base} — ${partes.join(', ')}` : base
}

// Qué tiene que pasar ahora, contado desde el lado de la clienta.
function proximoPaso(datos) {
  if (datos.pago === 'transferencia') {
    return 'Te escribimos por WhatsApp con los datos para transferir. Cuando nos pasás el comprobante, preparamos el pedido.'
  }
  if (datos.pago === 'mercadopago') {
    return 'Te escribimos por WhatsApp con el link de Mercado Pago para que pagues.'
  }
  return 'Pagás en efectivo cuando retirás el pedido.'
}

// ── Piezas ────────────────────────────────────────────────────
// La miniatura le ahorra a Lunare tener que buscar el código en la
// planilla para saber de qué pieza se trata.

function filasHTML(items, { conImagen }) {
  return items.map(i => {
    const foto = conImagen && i.imagen
      ? `<img src="${esc(productImage(i.imagen, 120))}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:6px">`
      : ''
    const link = i.slug
      ? `<a href="${SITE_URL}/producto/${esc(i.slug)}" style="color:${ORO};text-decoration:none">${esc(i.nombre)}</a>`
      : esc(i.nombre)

    return `<tr>
      ${conImagen ? `<td style="padding:10px 12px 10px 0;vertical-align:top;width:56px">${foto}</td>` : ''}
      <td style="padding:10px 12px 10px 0;vertical-align:top;font-size:14px;color:#2b2621">
        ${link}
        <div style="font-size:12px;color:${GRIS};padding-top:2px">
          ${esc(i.producto_id)}${i.material ? ` · ${esc(i.material)}` : ''}
        </div>
      </td>
      <td style="padding:10px 12px 10px 0;vertical-align:top;font-size:14px;color:${GRIS};text-align:center;white-space:nowrap">${i.cantidad}</td>
      <td style="padding:10px 0;vertical-align:top;font-size:14px;color:#2b2621;text-align:right;white-space:nowrap">${esc(formatPrice(i.precio_unitario * i.cantidad))}</td>
    </tr>`
  }).join('')
}

const filasTexto = items => items.map(i =>
  `- ${i.nombre} [${i.producto_id}] — ${i.cantidad} x ${formatPrice(i.precio_unitario)} = ${formatPrice(i.precio_unitario * i.cantidad)}`
).join('\n')

function totalesHTML(pedido) {
  const fila = (etiqueta, valor, fuerte) => `<tr>
    <td style="padding:4px 0;font-size:${fuerte ? '16px' : '14px'};color:${fuerte ? '#2b2621' : GRIS}">${etiqueta}</td>
    <td style="padding:4px 0;font-size:${fuerte ? '16px' : '14px'};font-weight:${fuerte ? '600' : '400'};color:#2b2621;text-align:right;white-space:nowrap">${esc(valor)}</td>
  </tr>`

  const envio = Number(pedido.costo_envio) > 0
    ? formatPrice(pedido.costo_envio)
    : 'sin cargo'

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${fila('Subtotal', formatPrice(pedido.subtotal))}
    ${fila('Envío', envio)}
    ${fila('Total', formatPrice(pedido.total), true)}
  </table>`
}

const totalesTexto = pedido => [
  `Subtotal: ${formatPrice(pedido.subtotal)}`,
  `Envío: ${Number(pedido.costo_envio) > 0 ? formatPrice(pedido.costo_envio) : 'sin cargo'}`,
  `Total: ${formatPrice(pedido.total)}`,
].join('\n')

// ── Envoltorio ────────────────────────────────────────────────
// Los clientes de mail no entienden hojas de estilo: todo va en línea y
// sobre tablas, que es lo único que renderiza parejo en todos lados.

function envoltorio({ titulo, encabezado, cuerpo }) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ef">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ef;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <tr><td style="padding:28px 28px 20px;border-bottom:1px solid #ece7e0">
    ${encabezado}
  </td></tr>
  <tr><td style="padding:24px 28px 28px">
    ${cuerpo}
  </td></tr>
  <tr><td style="padding:16px 28px 24px;border-top:1px solid #ece7e0;font-size:12px;color:${GRIS};line-height:1.6">
    Lunare Accesorios · Santa Rosa, La Pampa y Nueva Córdoba<br>
    <a href="${SITE_URL}" style="color:${ORO};text-decoration:none">lunareacc.com</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

const boton = (href, texto) =>
  `<a href="${href}" style="display:inline-block;background:${ORO};color:#ffffff;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:6px">${esc(texto)}</a>`

const dato = (etiqueta, valor) => valor
  ? `<tr>
      <td style="padding:6px 16px 6px 0;font-size:12px;color:${GRIS};white-space:nowrap;vertical-align:top">${esc(etiqueta)}</td>
      <td style="padding:6px 0;font-size:14px;color:#2b2621;vertical-align:top">${valor}</td>
    </tr>`
  : ''

// ── El mail a Lunare ──────────────────────────────────────────

function mailTienda({ pedido, datos, items }) {
  const wa = waLink(datos.telefono)
  const cuando = fecha(pedido.creado_en)

  const encabezado = `
    <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${GRIS}">Pedido nuevo${cuando ? ` · ${esc(cuando)}` : ''}</div>
    <div style="font-size:30px;color:${ORO};padding-top:6px;letter-spacing:0.04em">${esc(pedido.numero)}</div>
    <div style="font-size:16px;color:#2b2621;padding-top:4px">${esc(datos.nombre)} — ${esc(formatPrice(pedido.total))}</div>`

  const cuerpo = `
    ${wa ? `<div style="padding-bottom:22px">${boton(wa, 'Escribirle por WhatsApp')}</div>` : ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${dato('Teléfono', esc(datos.telefono))}
      ${dato('Correo', datos.email ? `<a href="mailto:${esc(datos.email)}" style="color:${ORO};text-decoration:none">${esc(datos.email)}</a>` : '')}
      ${dato('Entrega', esc(lineaEntrega(datos)))}
      ${dato('Pago', esc(etiquetaPago(datos.pago)))}
      ${dato('Notas', datos.notas ? esc(datos.notas) : '')}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px;border-top:1px solid #ece7e0">
      ${filasHTML(items, { conImagen: true })}
    </table>

    <div style="border-top:1px solid #ece7e0;margin-top:8px;padding-top:12px">
      ${totalesHTML(pedido)}
    </div>

    <div style="margin-top:24px;padding:14px 16px;background:#faf8f5;border-radius:6px;font-size:13px;color:${GRIS};line-height:1.6">
      El stock de la planilla no se descuenta solo: restá estas unidades a mano.
      El pedido queda en <b style="color:#2b2621">pendiente</b> hasta que lo marques pagado.
    </div>`

  const texto = [
    `Pedido nuevo ${pedido.numero}${cuando ? ` — ${cuando}` : ''}`,
    '',
    `${datos.nombre} — ${datos.telefono}`,
    datos.email ? `Correo: ${datos.email}` : '',
    wa ? `WhatsApp: ${wa}` : '',
    `Entrega: ${lineaEntrega(datos)}`,
    `Pago: ${etiquetaPago(datos.pago)}`,
    datos.notas ? `Notas: ${datos.notas}` : '',
    '',
    filasTexto(items),
    '',
    totalesTexto(pedido),
    '',
    'Acordate de descontar el stock en la planilla.',
  ].filter(Boolean).join('\n')

  return {
    to: destino(),
    subject: `Pedido ${pedido.numero} · ${formatPrice(pedido.total)} · ${datos.nombre}`,
    // Responder el mail le escribe a la clienta, no a la casilla del sitio.
    responderA: datos.email || undefined,
    html: envoltorio({ titulo: `Pedido ${pedido.numero}`, encabezado, cuerpo }),
    texto,
  }
}

// ── El mail a la clienta ──────────────────────────────────────

function mailClienta({ pedido, datos, items }) {
  const esEnvio = Boolean(ENTREGAS[datos.entrega]?.envio)
  const paso = proximoPaso(datos)

  const encabezado = `
    <div style="font-size:22px;color:#2b2621">Gracias por tu compra, ${esc(datos.nombre.split(' ')[0])}</div>
    <div style="font-size:14px;color:${GRIS};padding-top:8px;line-height:1.6">Tu pedido es el</div>
    <div style="font-size:30px;color:${ORO};padding-top:2px;letter-spacing:0.04em">${esc(pedido.numero)}</div>`

  const cuerpo = `
    <div style="font-size:15px;color:#2b2621;line-height:1.7">${esc(paso)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px;border-top:1px solid #ece7e0">
      ${filasHTML(items, { conImagen: true })}
    </table>

    <div style="border-top:1px solid #ece7e0;margin-top:8px;padding-top:12px">
      ${totalesHTML(pedido)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px">
      ${dato(esEnvio ? 'Enviamos a' : 'Retirás en', esc(lineaEntrega(datos)))}
      ${dato('Pago', esc(etiquetaPago(datos.pago)))}
    </table>

    <div style="margin-top:26px;font-size:14px;color:${GRIS};line-height:1.7">
      Cualquier cosa, escribinos por WhatsApp y te respondemos.
    </div>
    <div style="padding-top:14px">${boton(`https://wa.me/${WHATSAPP_LUNARE}`, 'Escribirnos por WhatsApp')}</div>`

  const texto = [
    `Gracias por tu compra, ${datos.nombre.split(' ')[0]}.`,
    `Tu pedido es el ${pedido.numero}.`,
    '',
    paso,
    '',
    filasTexto(items),
    '',
    totalesTexto(pedido),
    '',
    `${esEnvio ? 'Enviamos a' : 'Retirás en'}: ${lineaEntrega(datos)}`,
    `Pago: ${etiquetaPago(datos.pago)}`,
    '',
    `Cualquier cosa escribinos: https://wa.me/${WHATSAPP_LUNARE}`,
  ].join('\n')

  return {
    to: [datos.email],
    subject: `Tu pedido ${pedido.numero} en Lunare Accesorios`,
    html: envoltorio({ titulo: `Pedido ${pedido.numero}`, encabezado, cuerpo }),
    texto,
  }
}

// ── Punto de entrada ──────────────────────────────────────────
// Nunca tira: el pedido ya está guardado y una falla de mail no puede
// hacer que la clienta vea un error después de haber comprado. Los dos
// mails van por separado para que uno roto no se lleve al otro.

export async function avisarPedido({ pedido, datos, items }) {
  const salida = { tienda: false, clienta: false }

  if (!avisosConfigurados()) {
    console.warn(`[aviso] sin RESEND_API_KEY o AVISO_EMAIL_DESTINO: el pedido ${pedido.numero} no se avisó`)
    return salida
  }

  try {
    await enviar(mailTienda({ pedido, datos, items }))
    salida.tienda = true
  } catch (err) {
    console.error(`[aviso] no salió el mail a la tienda por ${pedido.numero}`, err)
  }

  if (datos.email) {
    try {
      await enviar(mailClienta({ pedido, datos, items }))
      salida.clienta = true
    } catch (err) {
      console.error(`[aviso] no salió el mail a la clienta por ${pedido.numero}`, err)
    }
  }

  return salida
}

// ── Arrepentimientos ──────────────────────────────────────────
// La Resolución 424/2020 pide devolverle a la clienta un código de
// identificación dentro de las 24 horas y por el mismo medio. El código
// ya se lo mostramos en pantalla al enviar el formulario; el mail es el
// respaldo escrito, y el que le llega a Lunare es el que abre el reloj.

function mailArrepentimientoTienda({ arrepentimiento: a, datos }) {
  const wa = waLink(datos.telefono)
  const cuando = fecha(a.creado_en)

  const encabezado = `
    <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${GRIS}">Arrepentimiento${cuando ? ` · ${esc(cuando)}` : ''}</div>
    <div style="font-size:30px;color:${ORO};padding-top:6px;letter-spacing:0.04em">${esc(a.codigo)}</div>
    <div style="font-size:16px;color:#2b2621;padding-top:4px">${esc(datos.nombre)}</div>`

  const cuerpo = `
    <div style="padding:14px 16px;background:#faf8f5;border-radius:6px;font-size:14px;color:#2b2621;line-height:1.6">
      Pidió revocar la compra. Por ley tenés que devolverle el importe sin cargo
      ni penalidad; el costo de la devolución corre por cuenta del negocio.
    </div>

    ${wa ? `<div style="padding:22px 0">${boton(wa, 'Escribirle por WhatsApp')}</div>` : '<div style="height:22px"></div>'}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${dato('Correo', `<a href="mailto:${esc(datos.email)}" style="color:${ORO};text-decoration:none">${esc(datos.email)}</a>`)}
      ${dato('Teléfono', datos.telefono ? esc(datos.telefono) : '')}
      ${dato('Pedido', a.pedido_numero
        ? `${esc(a.pedido_numero)}${a.pedido_encontrado ? '' : ' <span style="color:#b4442e">— no existe en la base, verificalo</span>'}`
        : '<span style="color:' + GRIS + '">no lo indicó</span>')}
      ${dato('Motivo', datos.detalle ? esc(datos.detalle) : `<span style="color:${GRIS}">no dejó detalle</span>`)}
    </table>

    <div style="margin-top:24px;font-size:13px;color:${GRIS};line-height:1.6">
      Ya le mandamos el código ${esc(a.codigo)} por mail, así que el plazo de 24 horas
      está cubierto. Queda en <b style="color:#2b2621">recibido</b> hasta que lo cambies en la base.
    </div>`

  const texto = [
    `Arrepentimiento ${a.codigo}${cuando ? ` — ${cuando}` : ''}`,
    '',
    `${datos.nombre} — ${datos.email}`,
    datos.telefono ? `Teléfono: ${datos.telefono}` : '',
    wa ? `WhatsApp: ${wa}` : '',
    a.pedido_numero
      ? `Pedido: ${a.pedido_numero}${a.pedido_encontrado ? '' : ' (no existe en la base, verificalo)'}`
      : 'Pedido: no lo indicó',
    datos.detalle ? `Motivo: ${datos.detalle}` : '',
    '',
    'Pidió revocar la compra. Por ley hay que devolverle el importe sin cargo',
    'ni penalidad, y el costo de la devolución corre por cuenta del negocio.',
    '',
    `Ya le mandamos el código ${a.codigo} por mail: el plazo de 24 horas está cubierto.`,
  ].filter(Boolean).join('\n')

  return {
    to: destino(),
    subject: `Arrepentimiento ${a.codigo} · ${datos.nombre}${a.pedido_numero ? ` · ${a.pedido_numero}` : ''}`,
    responderA: datos.email,
    html: envoltorio({ titulo: `Arrepentimiento ${a.codigo}`, encabezado, cuerpo }),
    texto,
  }
}

function mailArrepentimientoClienta({ arrepentimiento: a, datos }) {
  const encabezado = `
    <div style="font-size:22px;color:#2b2621">Recibimos tu pedido de arrepentimiento</div>
    <div style="font-size:14px;color:${GRIS};padding-top:8px;line-height:1.6">Tu código de identificación es</div>
    <div style="font-size:30px;color:${ORO};padding-top:2px;letter-spacing:0.04em">${esc(a.codigo)}</div>`

  const cuerpo = `
    <div style="font-size:15px;color:#2b2621;line-height:1.7">
      Guardá este código: identifica tu trámite. Te vamos a escribir para coordinar
      la devolución del importe y, si ya tenías la pieza, cómo nos la hacés llegar.
      No tenés que pagar nada por devolverla.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px">
      ${dato('Código', `<b>${esc(a.codigo)}</b>`)}
      ${dato('Pedido', a.pedido_numero ? esc(a.pedido_numero) : '')}
      ${dato('A nombre de', esc(datos.nombre))}
    </table>

    <div style="margin-top:26px;font-size:14px;color:${GRIS};line-height:1.7">
      Si algo de esto no es lo que pediste, escribinos y lo corregimos.
    </div>
    <div style="padding-top:14px">${boton(`https://wa.me/${WHATSAPP_LUNARE}`, 'Escribirnos por WhatsApp')}</div>`

  const texto = [
    'Recibimos tu pedido de arrepentimiento.',
    `Tu código de identificación es ${a.codigo}.`,
    '',
    'Guardá este código: identifica tu trámite. Te vamos a escribir para coordinar',
    'la devolución del importe y, si ya tenías la pieza, cómo nos la hacés llegar.',
    'No tenés que pagar nada por devolverla.',
    '',
    a.pedido_numero ? `Pedido: ${a.pedido_numero}` : '',
    `A nombre de: ${datos.nombre}`,
    '',
    `Cualquier cosa escribinos: https://wa.me/${WHATSAPP_LUNARE}`,
  ].filter(Boolean).join('\n')

  return {
    to: [datos.email],
    subject: `Tu arrepentimiento ${a.codigo} — Lunare Accesorios`,
    html: envoltorio({ titulo: `Arrepentimiento ${a.codigo}`, encabezado, cuerpo }),
    texto,
  }
}

export async function avisarArrepentimiento({ arrepentimiento, datos }) {
  const salida = { tienda: false, clienta: false }

  if (!avisosConfigurados()) {
    console.warn(`[aviso] sin RESEND_API_KEY o AVISO_EMAIL_DESTINO: el arrepentimiento ${arrepentimiento.codigo} no se avisó`)
    return salida
  }

  try {
    await enviar(mailArrepentimientoTienda({ arrepentimiento, datos }))
    salida.tienda = true
  } catch (err) {
    console.error(`[aviso] no salió el mail a la tienda por ${arrepentimiento.codigo}`, err)
  }

  try {
    await enviar(mailArrepentimientoClienta({ arrepentimiento, datos }))
    salida.clienta = true
  } catch (err) {
    console.error(`[aviso] no salió el mail a la clienta por ${arrepentimiento.codigo}`, err)
  }

  return salida
}
