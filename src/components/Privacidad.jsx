import { WHATSAPP_URL, INSTAGRAM_URL, INSTAGRAM_USUARIO } from '../lib/contacto'
import { RAZON_SOCIAL, CUIT, DOMICILIO } from '../lib/fiscal'

// ── Política de privacidad ────────────────────────────────────
// La pide la Ley 25.326 de Protección de Datos Personales: la tienda
// junta nombre, teléfono, correo y dirección de quien compra. También la
// exige Meta para poner su píxel.
//
// Describe lo que el sitio hace HOY. Si se agrega un servicio que reciba
// datos (el píxel de Meta, Google Analytics, una lista de mails), hay que
// sumarlo acá antes de prenderlo.
//
// Las dos leyendas del final son textuales: las exige la Disposición
// 10/2008 de la Dirección Nacional de Protección de Datos Personales.
//
// ⚠️ Es un texto base. Lo tiene que validar quien asesore al negocio.

const ACTUALIZADA = '15 de noviembre de 2026'

function Bloque({ titulo, children }) {
  return (
    <div>
      <h2 className='font-serif text-[26px] font-light text-dark mb-4 pb-3 border-b border-border'>{titulo}</h2>
      <div className='flex flex-col gap-3 text-[15px] leading-relaxed text-muted'>{children}</div>
    </div>
  )
}

export default function Privacidad() {
  const responsable = RAZON_SOCIAL
    ? `${RAZON_SOCIAL} (CUIT ${CUIT}), con domicilio en ${DOMICILIO}, que opera la tienda Lunare Accesorios`
    : 'Lunare Accesorios'

  return (
    <section className='px-6 pt-8 pb-24 md:px-12 bg-paper'>
      <div className='max-w-3xl mx-auto'>
        <nav aria-label='Ruta de navegación' className='flex items-center gap-2 mb-6 text-xs tracking-wide text-muted'>
          <a href='/' className='inline-flex items-center min-h-[44px] transition-colors hover:text-gold'>Inicio</a>
          <span className='text-[#8f877e]'>/</span>
          <span className='text-dark'>Privacidad</span>
        </nav>
        <p className='text-[11px] tracking-[0.2em] uppercase text-gold font-medium mb-2'>Tus datos</p>
        <h1 className='font-serif text-[clamp(34px,5vw,52px)] font-light text-dark mb-3'>Política de privacidad</h1>
        <p className='text-[13px] text-muted mb-12'>Última actualización: {ACTUALIZADA}</p>

        <div className='flex flex-col gap-12'>
          <Bloque titulo='Quién es responsable'>
            <p>
              El responsable de los datos que nos dejás en este sitio es {responsable}. Para cualquier
              consulta sobre tus datos escribinos por{' '}
              <a href={WHATSAPP_URL} target='_blank' rel='noopener noreferrer' className='underline hover:text-gold'>WhatsApp</a>{' '}
              o por Instagram a{' '}
              <a href={INSTAGRAM_URL} target='_blank' rel='noopener noreferrer' className='underline hover:text-gold'>@{INSTAGRAM_USUARIO}</a>.
            </p>
          </Bloque>

          <Bloque titulo='Qué datos pedimos'>
            <p><b className='font-medium text-dark'>Cuando hacés un pedido:</b> tu nombre, tu teléfono, tu correo (es opcional), y si elegís envío, tu código postal y tu dirección. También las notas que quieras dejarnos.</p>
            <p><b className='font-medium text-dark'>Cuando usás el Botón de arrepentimiento:</b> tu nombre, tu correo, tu teléfono si lo dejás, y el número de pedido si lo tenés.</p>
            <p><b className='font-medium text-dark'>Cuando navegás:</b> medimos visitas y qué productos se miran, de forma anónima y sin cookies, para saber qué funciona en la tienda. No sabemos quién sos por eso.</p>
            <p>El carrito se guarda solo en tu navegador, para que no se pierda si cerrás la página. No nos llega hasta que confirmás el pedido.</p>
          </Bloque>

          <Bloque titulo='Para qué los usamos'>
            <p>Para preparar y entregar tu pedido, cobrarlo, avisarte cómo va (por ejemplo, el número de seguimiento del envío) y atender cambios, devoluciones, garantías y reclamos.</p>
            <p>No los vendemos, no los alquilamos y no los usamos para mandarte publicidad sin que nos lo pidas.</p>
          </Bloque>

          <Bloque titulo='Con quién se comparten'>
            <p>Solo con quienes hacen falta para tu compra:</p>
            <ul className='flex flex-col gap-2 pl-5 list-disc'>
              <li><b className='font-medium text-dark'>Mercado Pago</b>, si pagás por ahí: procesa el pago. Los datos de tu tarjeta los carga directamente Mercado Pago; nunca pasan por nosotros.</li>
              <li><b className='font-medium text-dark'>El correo o transporte</b> que elegiste, si es envío: tu nombre, dirección y teléfono, para que te llegue.</li>
              <li><b className='font-medium text-dark'>Los servicios donde funciona la tienda</b>: Vercel (el sitio), Supabase (donde se guardan los pedidos) y Resend (los mails que te mandamos). Guardan los datos por nosotros y no los usan para nada más.</li>
            </ul>
            <p>Algunos de estos servicios guardan la información en servidores fuera de la Argentina.</p>
          </Bloque>

          <Bloque titulo='Cuánto tiempo los guardamos'>
            <p>Lo necesario para cumplir con tu compra y con nuestras obligaciones: la garantía, los reclamos y lo que pidan las normas impositivas. Después los borramos.</p>
          </Bloque>

          <Bloque titulo='Tus derechos'>
            <p>Podés pedirnos en cualquier momento que te digamos qué datos tuyos tenemos, que los corrijamos o que los borremos. Escribinos por WhatsApp o Instagram y te respondemos dentro de los 10 días corridos.</p>
            <p>El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326.</p>
            <p>La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>
          </Bloque>

          <Bloque titulo='Cambios a esta política'>
            <p>Si cambiamos algo, lo publicamos en esta misma página con la fecha de actualización.</p>
          </Bloque>
        </div>
      </div>
    </section>
  )
}
