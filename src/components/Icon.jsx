// Íconos de trazo, en una sola familia.
//
// Reemplazan a los emojis que se usaban como elemento gráfico (🌙 💍 ⚠️):
// cada sistema operativo los dibuja distinto, no se pueden recolorear con
// la marca y rompen el registro de la tienda.

const PATHS = {
  flecha: <path d='M5 12h14M13 6l6 6-6 6' />,
  mas: <path d='M12 5v14M5 12h14' />,
  menos: <path d='M5 12h14' />,
  check: <path d='M5 13l4 4L19 7' />,
  cerrar: <path d='M18 6L6 18M6 6l12 12' />,
  chevron: <path d='M6 9l6 6 6-6' />,
  buscar: <><circle cx='11' cy='11' r='7.5' /><path d='M21 21l-4.5-4.5' /></>,
  pin: <><path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z' /><circle cx='12' cy='10' r='3' /></>,
  escudo: <><path d='M12 2l7 3.5v6c0 4.6-3 8.3-7 10.5-4-2.2-7-5.9-7-10.5v-6z' /><path d='M9 12l2 2 4-4' /></>,
  cambio: <><path d='M3 12a9 9 0 019-9 9 9 0 018 5' /><path d='M21 3v5h-5' /><path d='M21 12a9 9 0 01-9 9 9 9 0 01-8-5' /><path d='M3 21v-5h5' /></>,
  tarjeta: <><rect x='2' y='5' width='20' height='14' rx='2' /><path d='M2 10h20' /></>,
  instagram: <><rect x='2.5' y='2.5' width='19' height='19' rx='5.5' /><circle cx='12' cy='12' r='4.2' /><circle cx='17.4' cy='6.6' r='1.1' fill='currentColor' stroke='none' /></>,
  bolsa: <><path d='M6 2L3 6.5V20a2 2 0 002 2h14a2 2 0 002-2V6.5L18 2z' /><path d='M3 6.5h18' /><path d='M16 10.5a4 4 0 01-8 0' /></>,
  caja: <><path d='M21 8v13H3V8' /><rect x='1' y='3' width='22' height='5' /><path d='M10 12h4' /></>,
  gota: <path d='M12 2.7S5.5 10 5.5 14.2a6.5 6.5 0 0013 0C18.5 10 12 2.7 12 2.7z' />,
  luna: <path d='M20.5 14.3A8.5 8.5 0 019.7 3.5a8.5 8.5 0 1010.8 10.8z' />,
  chispa: <path d='M12 2.5l2.1 5.9 5.9 2.1-5.9 2.1-2.1 5.9-2.1-5.9L4 10.5l5.9-2.1z' />,
  paño: <><path d='M3 7l4-3 5 2 5-2 4 3-3 4v9H6v-9z' /><path d='M9 6a3 3 0 006 0' /></>,
  reloj: <><circle cx='12' cy='12' r='9' /><path d='M12 7v5l3 2' /></>,
  alerta: <><path d='M12 3.5L2.5 20h19z' /><path d='M12 10v4' /><circle cx='12' cy='17' r='.6' fill='currentColor' stroke='none' /></>,
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.5, ...rest }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      focusable='false'
      className={className}
      {...rest}
    >
      {path}
    </svg>
  )
}

export function WhatsAppIcon({ size = 17, className = '' }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' focusable='false' className={className}>
      <path d='M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.03 1.02-1.03 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.34M12.05 21.8h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.22-3.74.99 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26C2.16 6.45 6.6 2.02 12.05 2.02c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.8 11.8 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z' />
    </svg>
  )
}
