import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { TERMS_VERSION } from './legalVersions';

export function TermsPage() {
  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24 text-ink dark:bg-[#1c211a] dark:text-ink-50">
      <article className="mx-auto max-w-4xl py-8">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300">
          <ArrowLeft className="h-4 w-4" /> Volver a IxmiPlace
        </Link>
        <header className="mb-8 rounded-3xl border border-cream-200 bg-white p-7 shadow-sm dark:border-[#4b5847] dark:bg-[#293027] sm:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
            <FileText className="h-4 w-4" /> Uso claro y responsable
          </div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Términos y Condiciones</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
            Versión {TERMS_VERSION}. Estos términos explican las reglas para usar IxmiPlace, una plataforma independiente en desarrollo para consultar y publicar anuncios de vivienda y hospedaje en Ixmiquilpan.
          </p>
        </header>

        <div className="space-y-5">
          <TermsSection title="1. Aceptación y cuenta">
            <p>Al crear una cuenta, iniciar sesión tras aceptar la versión vigente o publicar un anuncio, confirmas que leíste y aceptas estos términos y el Aviso de Privacidad. Debes proporcionar información correcta, cuidar tus credenciales y avisar si detectas un uso no autorizado de tu cuenta. Si no aceptas los términos, no uses las funciones que requieren cuenta.</p>
          </TermsSection>

          <TermsSection title="2. Qué hace IxmiPlace">
            <p>IxmiPlace ofrece herramientas para publicar y consultar anuncios, administrar disponibilidad, enviar mensajes y contactar directamente a quien publica. Actualmente las publicaciones son gratuitas. IxmiPlace no cobra rentas, ventas ni reservaciones, no retiene pagos de esas operaciones, no reserva habitaciones y no firma contratos en nombre de usuarios.</p>
            <p>La revisión o aprobación de un anuncio es una medida de moderación de la plataforma; no certifica la identidad del anunciante, la propiedad o autorización para ofrecer el inmueble, la exactitud de los datos, sus condiciones, disponibilidad, permisos ni la seguridad del lugar. IxmiPlace no participa como parte en el contrato que acuerden las personas usuarias.</p>
          </TermsSection>

          <TermsSection title="3. Reglas para publicar">
            <p>Al publicar, declaras que tienes autorización para ofrecer el inmueble o habitación y que los datos, precios, disponibilidad, fotografías y demás contenido son correctos y están actualizados. También declaras que tienes derecho a usar las fotografías y materiales que subas.</p>
            <p>No publiques anuncios falsos, engañosos, duplicados, fraudulentos, ilegales, que vulneren derechos de terceros o que incluyan datos personales de otra persona sin autorización. No suplantes identidades ni uses IxmiPlace para hostigar, discriminar ilegalmente, enviar spam o intentar obtener pagos mediante engaño.</p>
            <p>La zona, ubicación del mapa, descripción, precio y fotografías de anuncios aprobados pueden quedar visibles públicamente. El teléfono se muestra de acuerdo con la opción seleccionada al publicar. La dirección exacta se guarda separada del anuncio en las publicaciones nuevas; algunas publicaciones antiguas pueden conservarla en su ficha hasta que el administrador complete su migración. Evita escribirla en la descripción.</p>
          </TermsSection>

          <TermsSection title="4. Trato entre usuarios y seguridad">
            <p>Antes de entregar dinero, firmar o reservar, verifica por tu cuenta la identidad de la otra persona, su autorización para ofrecer el inmueble, las condiciones y la disponibilidad; visita el lugar cuando sea posible y formaliza por escrito los acuerdos importantes. No envíes anticipos basándote únicamente en fotografías o mensajes.</p>
            <p>Las conversaciones, visitas, negociaciones, pagos y contratos se acuerdan directamente entre las personas usuarias. IxmiPlace no puede garantizar que una persona cumpla lo prometido ni resolver en nombre de las partes sus controversias. Puedes reportar anuncios o conductas sospechosas para que sean revisados.</p>
          </TermsSection>

          <TermsSection title="5. Moderación y disponibilidad">
            <p>IxmiPlace puede revisar, rechazar, ocultar o retirar anuncios y suspender cuentas cuando existan indicios de información falsa, abuso, riesgo, incumplimiento de estos términos o de la ley. La plataforma puede actualizar, interrumpir o retirar funciones durante su desarrollo. La revisión no implica verificación legal o física del inmueble.</p>
          </TermsSection>

          <TermsSection title="6. Contenido que publicas">
            <p>Conservas tus derechos sobre el contenido que subas. Para mostrar y operar el anuncio, autorizas a IxmiPlace a alojarlo, reproducirlo técnicamente y mostrarlo dentro del servicio mientras mantengas la publicación activa, sujeto a tus controles de disponibilidad y retiro. No concedemos por esta cláusula derechos de propiedad sobre tus materiales.</p>
          </TermsSection>

          <TermsSection title="7. Apoyo voluntario">
            <p>El apoyo mostrado en la página correspondiente es voluntario, se realiza directamente fuera de IxmiPlace y está destinado a apoyar a la mamá del creador. No es requisito para usar la plataforma ni otorga publicaciones, posiciones preferentes o servicios especiales. IxmiPlace no procesa ni confirma las transferencias.</p>
          </TermsSection>

          <TermsSection title="8. Servicios externos y límites">
            <p>El servicio depende de proveedores externos para autenticación, base de datos, mapas, imágenes y alojamiento. Sus interrupciones o condiciones también pueden afectar algunas funciones. IxmiPlace está en desarrollo y no promete disponibilidad ininterrumpida ni ausencia total de errores.</p>
            <p>Estos términos no eliminan los derechos irrenunciables de las personas consumidoras ni excluyen responsabilidades que la ley no permita excluir. Cada persona usuaria sigue siendo responsable de sus declaraciones, contenido y acuerdos con otras personas.</p>
          </TermsSection>

          <TermsSection title="9. Cambios y contacto">
            <p>Podremos actualizar estos términos cuando cambie el servicio o sus obligaciones. Publicaremos la nueva versión y, si el cambio requiere una aceptación nueva para continuar usando funciones de cuenta, volveremos a solicitarla. Para dudas, reportes o reclamos relacionados con IxmiPlace, escribe a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:angeld10293@gmail.com">angeld10293@gmail.com</a>.</p>
            <p>El Aviso de Privacidad está disponible <Link className="font-semibold text-brand-700 underline dark:text-brand-300" to="/aviso-de-privacidad">en esta página</Link>.</p>
          </TermsSection>
        </div>
      </article>
    </main>
  );
}

function TermsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-cream-200 bg-white p-6 leading-relaxed text-ink-600 shadow-sm dark:border-[#4b5847] dark:bg-[#293027] dark:text-ink-200 sm:p-7">
      <h2 className="mb-3 text-lg font-bold text-ink-800 dark:text-ink-50">{title}</h2>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}
