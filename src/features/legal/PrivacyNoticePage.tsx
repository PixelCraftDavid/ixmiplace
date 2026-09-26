import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export function PrivacyNoticePage() {
  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24 text-ink dark:bg-[#1c211a] dark:text-ink-50">
      <article className="mx-auto max-w-4xl py-8">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300">
          <ArrowLeft className="h-4 w-4" /> Volver a IxmiPlace
        </Link>
        <header className="mb-8 rounded-3xl border border-cream-200 bg-white p-7 shadow-sm dark:border-[#4b5847] dark:bg-[#293027] sm:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
            <ShieldCheck className="h-4 w-4" /> Privacidad y transparencia
          </div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Aviso de Privacidad Integral</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
            Última actualización: 26 de septiembre de 2026 (versión 2). Este aviso explica cómo se tratan los datos personales al usar IxmiPlace, proyecto independiente en desarrollo para publicar y consultar propiedades en Ixmiquilpan.
          </p>
        </header>

        <div className="space-y-5">
          <NoticeSection title="1. Responsable y contacto">
            <p>El responsable del tratamiento es <strong>Ángel David Santos Pacheco</strong>. El proyecto se opera desde <strong>Ixmiquilpan, Hidalgo, México</strong>. Para consultas sobre privacidad o para ejercer derechos ARCO, escribe a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:angeld10293@gmail.com">angeld10293@gmail.com</a>; ese es el canal digital de contacto y recepción de solicitudes.</p>
          </NoticeSection>

          <NoticeSection title="2. Datos que podemos tratar">
            <ul className="list-disc space-y-2 pl-5">
              <li>Identificación y cuenta: nombre, correo electrónico, identificadores de cuenta y estado de verificación. La autenticación puede gestionarse con Firebase Authentication o Google si eliges ese acceso; IxmiPlace no recibe ni guarda tu contraseña de Google.</li>
              <li>Contacto y perfil: teléfono/WhatsApp, foto de perfil y nombre visible.</li>
              <li>Publicaciones: título, descripción, categoría, precio, zona y ubicación que aparece en el mapa, fotografías, servicios, teléfono si decides mostrarlo y disponibilidad.</li>
              <li>Uso de la plataforma: favoritos, mensajes, reportes, notificaciones, historial de publicaciones y contadores de visitas/contactos.</li>
              <li>Constancias de elección: versiones y fechas de aceptación de los Términos y de los avisos/consentimientos mostrados al crear una cuenta, publicar, completar el perfil, enviar mensajes o reportes.</li>
              <li>Apoyo voluntario: la página de apoyo muestra públicamente la CLABE de Mercado Pago del responsable para recibir transferencias. IxmiPlace no solicita ni guarda los datos bancarios de quien envía el apoyo.</li>
              <li>Si escribes al correo de contacto, el contenido del mensaje y la dirección desde la que lo envías para responder tu consulta o coordinar un apoyo voluntario.</li>
              <li>Datos técnicos del navegador: preferencia de tema y marcas locales que ayudan a evitar registrar repetidamente ciertos contadores de visitas y contactos, además del estado de sesión administrado por Firebase Authentication.</li>
            </ul>
            <p className="mt-3">IxmiPlace no solicita intencionalmente datos personales sensibles. Evita incluirlos en mensajes, reportes o publicaciones.</p>
            <p>El sitio guarda la preferencia de tema y esas marcas técnicas en <code>localStorage</code>. Firebase Authentication conserva el estado de inicio de sesión mediante persistencia local, usando el mecanismo compatible con el navegador, como IndexedDB o <code>localStorage</code>. El código propio revisado no usa <code>sessionStorage</code> ni configura cookies de publicidad o perfilamiento; los proveedores externos pueden utilizar tecnologías propias necesarias para sus servicios conforme a sus avisos y condiciones.</p>
          </NoticeSection>

          <NoticeSection title="3. Finalidades">
            <p>Tratamos los datos para crear y proteger cuentas; verificar correo; completar perfiles; publicar y administrar anuncios; permitir mensajes entre personas interesadas y propietarios; gestionar favoritos, reportes y notificaciones; moderar contenido; prevenir abuso, fraude o spam; mantener la seguridad y el funcionamiento técnico; documentar las aceptaciones y autorizaciones que manifiestas; y responder solicitudes de privacidad.</p>
            <p>Si en el futuro se agregan comunicaciones promocionales u otra finalidad secundaria, se informará antes de utilizarlas y se ofrecerán medios para limitar su uso cuando corresponda.</p>
          </NoticeSection>

          <NoticeSection title="4. Información visible y contacto entre usuarios">
            <p>Los anuncios publicados, sus fotografías, descripción, precio, zona y ubicación mostrada en el mapa pueden ser consultados por visitantes. Si activas la opción para mostrar tu teléfono, tu número de WhatsApp también será visible para facilitar el contacto. Los mensajes internos se comparten con el propietario del anuncio al que escribes y con el equipo administrador cuando sea necesario para atender reportes o seguridad.</p>
            <p>La dirección exacta que proporciones se usa para gestionar el anuncio y, en la versión actual, se guarda aparte de la ficha pública. Los anuncios creados antes de esta separación pueden conservar el dato en su ficha hasta que el administrador complete la migración. No incluyas en la descripción información que no quieras hacer visible públicamente.</p>
          </NoticeSection>

          <NoticeSection title="5. Proveedores de tecnología">
            <p>Para operar el servicio se utilizan proveedores tecnológicos que pueden tratar información por cuenta del responsable: Firebase/Google para autenticación y base de datos; Cloudinary para almacenar y entregar imágenes; Vercel para alojamiento; y OpenStreetMap/Nominatim para mostrar mapas y buscar ubicaciones. El apoyo voluntario se realiza fuera de IxmiPlace mediante una transferencia iniciada desde el banco o Mercado Pago de quien aporta; esas instituciones procesan la operación según sus propios avisos y condiciones. También puede haber comunicación directa por correo o WhatsApp si tú eliges esos canales. Estos proveedores pueden operar infraestructura fuera de México conforme a sus servicios y condiciones.</p>
          </NoticeSection>

          <NoticeSection title="6. Conservación y opciones para limitar el uso">
            <p>Conservamos los datos mientras la cuenta, publicación o interacción siga activa y durante el tiempo adicional que sea necesario para seguridad, moderación, atención de solicitudes o cumplimiento de obligaciones. Puedes editar o retirar tus publicaciones y dejar de usar la cuenta. También puedes solicitar acceso, rectificación, cancelación u oposición escribiendo al correo indicado.</p>
            <p>Cuando una cancelación proceda, dejaremos de usar los datos para la operación ordinaria y los mantendremos bloqueados, con acceso restringido, únicamente durante el plazo legal aplicable para atender o determinar responsabilidades derivadas de su tratamiento. Durante el bloqueo no se usarán para otros fines. Al terminar ese plazo, se suprimirán, salvo que una obligación legal o una excepción prevista por la ley requiera conservarlos.</p>
          </NoticeSection>

          <NoticeSection title="7. Derechos ARCO">
            <p>Puedes solicitar acceso a tus datos, su rectificación, cancelación u oponerte a su tratamiento. Envía un correo a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:angeld10293@gmail.com">angeld10293@gmail.com</a> con el asunto “Solicitud de privacidad”, tu nombre, un medio para recibir respuesta, el correo asociado a tu cuenta, el derecho que deseas ejercer y una descripción suficiente para localizar tus datos. Para protegerlos, podremos solicitar información razonable para verificar tu identidad.</p>
            <p>Comunicaremos la determinación en un plazo máximo de <strong>20 días hábiles</strong> desde que recibamos la solicitud. Si resulta procedente, la haremos efectiva dentro de los <strong>15 días hábiles</strong> siguientes a la comunicación de la respuesta. La ley permite ampliar esos plazos una sola vez por un periodo igual cuando las circunstancias del caso lo justifiquen.</p>
          </NoticeSection>

          <NoticeSection title="8. Seguridad, cambios y proyecto en desarrollo">
            <p>Se aplican controles técnicos y de acceso para reducir riesgos, pero ningún servicio conectado a Internet puede prometer seguridad absoluta. IxmiPlace sigue en desarrollo: puedes probar sus funciones y con el tiempo se incorporarán mejoras. Si una actualización cambia de forma relevante el tratamiento de datos, se publicará la versión actualizada en esta página y se comunicará por los medios disponibles.</p>
          </NoticeSection>
        </div>
      </article>
    </main>
  );
}

function NoticeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-cream-200 bg-white p-6 leading-relaxed text-ink-600 shadow-sm dark:border-[#4b5847] dark:bg-[#293027] dark:text-ink-200 sm:p-7">
      <h2 className="mb-3 text-lg font-bold text-ink-800 dark:text-ink-50">{title}</h2>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}
