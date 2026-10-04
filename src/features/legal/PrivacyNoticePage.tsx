import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { PRIVACY_NOTICE_VERSION } from './legalVersions';
import { AnalyticsPreferencesButton } from '../../components/seo/AnalyticsConsent';

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
            Última actualización: 3 de octubre de 2026 (versión {PRIVACY_NOTICE_VERSION}). Este aviso explica cómo se tratan los datos personales al usar IxmiPlace, un proyecto independiente en desarrollo para publicar y consultar opciones de vivienda y hospedaje en Ixmiquilpan.
          </p>
        </header>

        <div className="space-y-5">
          <NoticeSection title="1. Responsable y contacto">
            <p>El responsable del tratamiento es la persona física <strong>Ángel David Santos Pacheco</strong>, quien opera IxmiPlace por cuenta propia y no como una sociedad constituida. El proyecto se opera en Ixmiquilpan, Hidalgo, México.</p>
            <p><strong>Domicilio del responsable para oír y recibir comunicaciones: [PENDIENTE DE COMPLETAR ANTES DE PUBLICAR ESTA VERSIÓN].</strong> La ley exige identificar el domicilio del responsable; mencionar únicamente Ixmiquilpan no ofrece un lugar efectivo para localizarlo o recibir comunicaciones. No publiques esta versión hasta completar este campo con un domicilio real y operativo, o hasta obtener asesoría sobre una alternativa jurídicamente válida que proteja tu domicilio residencial.</p>
            <p>Para consultas de privacidad y solicitudes ARCO, escribe a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:ixmiplacesupport@gmail.com">ixmiplacesupport@gmail.com</a>, con el asunto “Solicitud ARCO”.</p>
          </NoticeSection>

          <NoticeSection title="2. Datos personales que tratamos">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Cuenta e identificación:</strong> nombre visible, correo, UID o identificadores de cuenta y estado de verificación. Firebase Authentication o Google gestiona la autenticación; IxmiPlace no recibe ni guarda tu contraseña de Google. Si solicitas recuperar una contraseña de IxmiPlace, Firebase Authentication procesa el correo y envía el enlace de restablecimiento.</li>
              <li><strong>Perfil y contacto:</strong> teléfono/WhatsApp, foto de perfil y nombre visible.</li>
              <li><strong>Publicaciones:</strong> título, descripción, categoría, precio, zona, ubicación mostrada en el mapa, fotografías, amenidades, lugares y servicios cercanos, rutas o destinos de transporte, disponibilidad y, si quien publica lo indica, una percepción general de seguridad de la zona y la frecuencia de problemas de agua. La dirección exacta y el WhatsApp se almacenan por separado del anuncio.</li>
              <li><strong>Actividad:</strong> favoritos, mensajes internos (asunto, contenido, participantes y estado de lectura), reportes, notificaciones, historial de publicaciones y contadores de visitas/contactos.</li>
              <li><strong>Notificaciones push:</strong> si las activas, se guarda un token técnico del dispositivo o navegador. No contiene el texto de tus mensajes. Puedes desactivarlas desde IxmiPlace o los ajustes del sistema.</li>
              <li><strong>Elecciones y consentimientos:</strong> versiones de los documentos aceptados y marcas de tiempo de aceptación o de consentimientos específicos.</li>
              <li><strong>Soporte:</strong> contenido y dirección de correo de los mensajes que envías al contacto de IxmiPlace.</li>
              <li><strong>Datos técnicos y de seguridad:</strong> registros de solicitudes y errores, datos técnicos de conexión y un identificador derivado mediante hash de la dirección IP para limitar abusos. Los registros de seguridad propios no incluyen el contenido de mensajes, credenciales ni la IP en claro; el proveedor de alojamiento puede procesar datos de conexión conforme a su servicio.</li>
              <li><strong>Analítica opcional:</strong> si el responsable configura Google Analytics y aceptas expresamente, se registran datos de uso como las páginas visitadas, su título y datos técnicos básicos del navegador. Si lo rechazas, el script de analítica no se carga.</li>
              <li>Cuando App Check esté configurado, se procesa temporalmente un token de verificación para validar que la solicitud proviene de una instancia autorizada de la aplicación.</li>
              <li><strong>Identificadores temporales de límites:</strong> se usan para frenar automatización y consultas masivas, y se eliminan mediante el proceso de limpieza, con un periodo previsto de hasta ocho días.</li>
            </ul>
            <p>IxmiPlace no solicita intencionalmente datos personales sensibles. No incluyas datos de salud, financieros, biométricos, de menores u otra información íntima en publicaciones, mensajes o reportes. Si se proporcionan incidentalmente, se tratarán solo en lo indispensable para gestionar la solicitud, moderar o cumplir obligaciones legales.</p>
          </NoticeSection>

          <NoticeSection title="3. Almacenamiento local y tecnologías similares">
            <p>El sitio usa <code>localStorage</code> para la preferencia de tema, la elección sobre analítica opcional y marcas técnicas que evitan registrar repetidamente algunos contadores. El flujo de verificación de correo usa <code>sessionStorage</code> para conservar temporalmente el momento del último envío. Firebase Authentication mantiene la sesión mediante persistencia local compatible con el navegador, como IndexedDB o <code>localStorage</code>.</p>
            <p>Google Analytics permanece apagado hasta que el responsable lo configure y tú lo aceptes. Puedes rechazarlo o cambiar tu elección aquí; la decisión no bloquea las funciones principales. IxmiPlace no configura publicidad dirigida ni píxeles publicitarios. Google/Firebase, Cloudinary, Vercel, OpenStreetMap/Nominatim, WhatsApp y Mercado Pago pueden recibir identificadores o datos de conexión cuando se usan sus funciones; cada proveedor puede emplear cookies, almacenamiento o tecnologías propias según su servicio y aviso. Puedes borrar el almacenamiento del navegador y administrar sus permisos, aunque eso puede cerrar tu sesión o desactivar funciones.</p>
            <AnalyticsPreferencesButton />
          </NoticeSection>

          <NoticeSection title="4. Finalidades y consentimiento">
            <p><strong>Finalidades primarias, necesarias para operar las funciones que solicitas:</strong> crear, autenticar, recuperar y proteger cuentas; verificar correo; mantener el perfil; crear, mostrar, actualizar y moderar publicaciones; mostrar públicamente la información que el anunciante elige publicar; facilitar mensajes o contacto solicitados entre usuarios; gestionar favoritos, reportes, notificaciones elegidas, soporte y eliminación de cuenta; prevenir fraude, abuso y spam; mantener registros de seguridad; y atender obligaciones legales y solicitudes ARCO.</p>
            <p><strong>Finalidades secundarias:</strong> la analítica opcional se usa únicamente para conocer el uso general del sitio y mejorarlo; solo se activa después de tu aceptación y puedes rechazarla sin perder funciones. IxmiPlace no usa datos para publicidad dirigida, venta de bases de datos ni perfilamiento comercial. Si se incorporan comunicaciones promocionales u otra finalidad secundaria que requiera consentimiento, se informará por separado.</p>
            <p>La publicación de un anuncio y la comunicación de datos de contacto a otro usuario ocurren conforme a las opciones y acciones que eliges; no constituyen permiso general para divulgar todos los datos de tu cuenta. Las casillas de aceptación deben permanecer desmarcadas hasta que las marques.</p>
          </NoticeSection>

          <NoticeSection title="5. Información pública y comunicación entre usuarios">
            <p>Los anuncios publicados, fotografías, descripción, precio, zona, ubicación aproximada mostrada en el mapa, referencias y servicios cercanos, rutas o destinos, y la información que quien publica decida aportar sobre agua y percepción de seguridad son públicos y pueden copiarse o indexarse por terceros. La información de seguridad y agua es una declaración no verificada del anunciante, no una evaluación ni garantía de IxmiPlace. El teléfono de WhatsApp se guarda en un documento separado. Si el anunciante autorizó mostrarlo, se entrega a quien usa el control de contacto, sujeto a verificación y controles técnicos vigentes; al abrir WhatsApp, el número y el mensaje que decidas enviar se comunican a Meta/WhatsApp y a la persona anunciante.</p>
            <p>La dirección exacta se mantiene separada y debe ser accesible solo al propietario y la administración conforme a las reglas vigentes. El responsable debe comprobar que las reglas publicadas y la migración de anuncios antiguos coincidan con el código antes de afirmar que esos datos están protegidos. No incluyas datos personales en campos públicos.</p>
          </NoticeSection>

          <NoticeSection title="6. Proveedores, destinatarios y transferencias">
            <p><strong>Proveedores técnicos:</strong> Google/Firebase procesa autenticación, perfiles, base de datos, App Check y, si las activas, notificaciones push; si habilitas la analítica, Google Analytics recibe datos de navegación y métricas de uso. Vercel aloja la aplicación y ejecuta endpoints; Cloudinary almacena y entrega fotografías; OpenStreetMap/Nominatim presta mapas y geocodificación. Reciben las categorías necesarias para prestar esas funciones, como identificadores de cuenta, solicitudes, imágenes o ubicación consultada. Pueden operar infraestructura fuera de México y tratar datos conforme a sus términos y avisos.</p>
            <p><strong>Comunicación a otras personas:</strong> al publicar, los datos que seleccionas se muestran a visitantes. Los mensajes internos se almacenan para que el destinatario pueda leerlos desde su cuenta y responderte. Si activa las notificaciones push, Firebase Cloud Messaging recibe el token del dispositivo y una alerta genérica, sin el contenido del mensaje. Si abre WhatsApp, Meta/WhatsApp recibe la información que la función transfiere y la que usted envía. Estos destinatarios pueden tratar datos para sus propios fines conforme a sus avisos.</p>
            <p>La página de apoyo muestra una CLABE de Mercado Pago para transferencias voluntarias externas. IxmiPlace no inicia ni procesa la transferencia ni recibe los datos bancarios de quien aporta; Mercado Pago y la institución bancaria tratan los datos de esa operación. El responsable no ofrece recibos deducibles de impuestos.</p>
          </NoticeSection>

          <NoticeSection title="7. Limitación de uso, conservación y eliminación">
            <p>Puedes limitar la divulgación retirando o editando una publicación, desactivando la visualización del teléfono cuando esa opción esté disponible, desactivando notificaciones push, dejando de usar la cuenta o solicitando su eliminación desde el perfil. Actualmente no se envían comunicaciones promocionales.</p>
            <p>Conservamos los datos mientras sean necesarios para la cuenta, publicación o interacción. La eliminación de cuenta suprime o desasocia los datos operativos cubiertos por esa función, pero no borra copias que terceros ya hayan obtenido ni registros que deban conservarse bloqueados para atender una controversia, seguridad u obligación legal. Los identificadores de límites se marcan con vencimiento de hasta ocho días; su supresión efectiva depende de la ejecución periódica del proceso de limpieza por administración y no ocurre automáticamente al llegar esa fecha. Los respaldos y registros de plataforma se eliminan conforme a sus ciclos técnicos y legales aplicables.</p>
          </NoticeSection>

          <NoticeSection title="8. Derechos ARCO y procedimiento">
            <p>Envía gratuitamente un correo a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:ixmiplacesupport@gmail.com">ixmiplacesupport@gmail.com</a> con asunto “Solicitud ARCO”. Incluye: (1) tu nombre y un medio para recibir respuesta; (2) correo asociado a la cuenta; (3) derecho que ejerces —acceso, rectificación, cancelación u oposición— y descripción clara de los datos o solicitud; y (4) para rectificación, el dato correcto y documentos que la sustenten. Acredita tu identidad y, si actúas por representación, la representación e identidad correspondientes. No envíes una identificación completa salvo que se solicite de forma segura; puedes ocultar datos que no sean necesarios. Podremos pedir aclaraciones o verificación proporcional para proteger tus datos. Daremos seguimiento por el correo indicado.</p>
            <p>La determinación se comunicará dentro de un máximo de <strong>20 días</strong> contados desde la recepción. Si procede, se hará efectiva dentro de los <strong>15 días</strong> siguientes a la comunicación. Los plazos pueden ampliarse una sola vez por un periodo igual si las circunstancias lo justifican. El acceso se entregará por medios electrónicos, previa verificación de identidad. Si se niega total o parcialmente, explicaremos la causa. El ejercicio es gratuito salvo costos de reproducción o envío permitidos por la ley.</p>
            <p>Si consideras insuficiente la respuesta o no se atiende tu solicitud, puedes acudir ante la autoridad competente en protección de datos personales conforme a la LFPDPPP vigente, actualmente la Secretaría Anticorrupción y Buen Gobierno, sin renunciar a otros derechos que te correspondan.</p>
          </NoticeSection>

          <NoticeSection title="9. Seguridad e incidentes">
            <p>Se aplican medidas técnicas y organizativas proporcionales, entre ellas controles de acceso, autenticación, validación de entradas, límites de uso, registros de seguridad y controles de subida. Algunas medidas dependen de la configuración de producción y de los proveedores; su mención aquí no sustituye la verificación de que estén activas. Si un incidente de seguridad afecta significativamente tus derechos patrimoniales o morales, se te notificará de manera inmediata conforme a la ley. Ningún sistema conectado a Internet puede garantizar seguridad absoluta.</p>
          </NoticeSection>

          <NoticeSection title="10. Cambios al aviso">
            <p>IxmiPlace está en desarrollo. Los cambios se publicarán en esta ruta indicando versión y fecha, y se comunicarán por correo o dentro del servicio. Si un cambio modifica finalidades que requieren consentimiento, se solicitará nuevamente antes de tratar datos para ellas. Para cualquier duda o solicitud, escribe a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:ixmiplacesupport@gmail.com">ixmiplacesupport@gmail.com</a>.</p>
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
