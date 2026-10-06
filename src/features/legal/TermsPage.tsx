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
            Versión {TERMS_VERSION}. Vigentes desde su publicación. Regulan el uso de IxmiPlace, proyecto independiente en desarrollo para consultar y publicar anuncios de vivienda y hospedaje en Ixmiquilpan.
          </p>
        </header>

        <div className="space-y-5">
          <TermsSection title="1. Responsable, edad y aceptación">
            <p>IxmiPlace es operado por Ángel David Santos Pacheco como persona física, desde Ixmiquilpan, Hidalgo, México. El domicilio físico para comunicaciones y notificaciones se identifica en el Aviso de Privacidad. Contacto: <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:ixmiplacesupport@gmail.com">ixmiplacesupport@gmail.com</a>.</p>
            <p>Las funciones con cuenta están dirigidas a personas de 18 años o más. Al registrarte declaras cumplir esa edad y tener capacidad para aceptar estos términos. No se permite que menores creen cuentas o publiquen. Si detectamos indicios razonables de una cuenta de una persona menor, podremos limitarla y atender sus datos conforme a la ley.</p>
            <p>La aceptación se realiza mediante casillas inicialmente desmarcadas y un control expreso de confirmación. Se registran la versión de los documentos y la fecha/hora del acto. El Aviso de Privacidad explica el tratamiento de datos y se acepta por separado. Si no estás de acuerdo, no uses las funciones que requieren cuenta.</p>
          </TermsSection>

          <TermsSection title="2. Servicio y relación entre usuarios">
            <p>IxmiPlace ofrece herramientas para publicar y consultar anuncios, administrar disponibilidad, guardar favoritos, enviar mensajes y contactar a quien publica. Actualmente las publicaciones y funciones principales son gratuitas. El servicio no cobra rentas, ventas ni reservaciones, no retiene pagos de esas operaciones, no reserva inmuebles ni firma contratos en nombre de usuarios.</p>
            <p>IxmiPlace facilita la publicación y el contacto, pero no es propietario, arrendador, vendedor, corredor, agente, representante ni parte de las operaciones entre usuarios. No verifica de forma física o jurídica la identidad de anunciantes, titularidad o autorización sobre inmuebles, permisos, exactitud, condiciones, disponibilidad o seguridad. La aprobación de un anuncio es moderación de contenido, no certificación ni garantía.</p>
          </TermsSection>

          <TermsSection title="3. Cuenta y responsabilidades de la persona usuaria">
            <p>Proporciona información veraz, mantén tus datos actualizados, protege tus credenciales y avisa al contacto de IxmiPlace si sospechas de uso no autorizado. Eres responsable de las acciones efectuadas desde tu cuenta, salvo que la ley disponga otra cosa o el acceso no autorizado derive de una falla atribuible al responsable.</p>
            <p>No uses el servicio para fraude, suplantación, hostigamiento, discriminación ilícita, spam, scraping, automatización abusiva, acceso no autorizado, interferencia técnica, publicación de malware o elusión de controles. No intentes recolectar masivamente datos o teléfonos.</p>
          </TermsSection>

          <TermsSection title="4. Publicaciones, imágenes y contacto">
            <p>Al publicar declaras que tienes autorización para ofrecer el inmueble y que los datos, precio, disponibilidad, fotografías y materiales son correctos, actuales y pueden publicarse. Responde por los derechos de terceros que pudieran afectarse por el contenido que aportas.</p>
            <p>Los anuncios aprobados, fotografías, descripción, precio, zona y ubicación que muestra el mapa pueden ser visibles públicamente, indexados, copiados o compartidos por terceros. No incluyas dirección exacta, documentos, datos de contacto de otra persona ni información que no quieras divulgar en campos públicos. El teléfono se trata conforme a las opciones de publicación y al Aviso de Privacidad.</p>
            <p>Verifica por tu cuenta la identidad y autorización de la contraparte, las condiciones, disponibilidad y estado del inmueble. Antes de enviar dinero, firmar o reservar, visita el lugar cuando sea posible y formaliza por escrito los acuerdos importantes. No envíes anticipos basándote únicamente en fotografías o mensajes.</p>
            <p>Conversaciones, visitas, negociaciones, pagos, arrendamientos, ventas y contratos se acuerdan directamente entre las personas usuarias. IxmiPlace no puede garantizar que otra persona cumpla lo ofrecido ni resolver en su nombre una controversia. Reporta anuncios o conductas sospechosas desde las herramientas disponibles.</p>
            <p>Los mensajes internos se almacenan para que el destinatario pueda leerlos desde su cuenta y responder. El contenido no está cifrado de extremo a extremo y puede ser procesado por IxmiPlace para prestar y proteger la función. No incluyas información financiera, contraseñas ni datos personales innecesarios. IxmiPlace puede limitar o retirar mensajes que incumplan estas condiciones o que se reporten por abuso.</p>
          </TermsSection>

          <TermsSection title="5. Moderación, reportes y medidas de cuenta">
            <p>Podemos revisar, rechazar, ocultar o retirar publicaciones y limitar o suspender cuentas cuando existan indicios razonables de fraude, riesgo, contenido ilícito, abuso, incumplimiento de estos términos o requerimiento legal. Procuraremos informar el motivo y permitir que la persona afectada solicite revisión, salvo que hacerlo comprometa una investigación, la seguridad de alguien o una obligación legal.</p>
            <p>Un reporte es una señal para revisión, no una determinación judicial. La persona usuaria puede responder o apelar una medida escribiendo a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:ixmiplacesupport@gmail.com">ixmiplacesupport@gmail.com</a> con el asunto “Revisión de moderación” y los datos que permitan localizar el caso. Las decisiones se revisarán considerando el contexto y la información disponible.</p>
          </TermsSection>

          <TermsSection title="6. Propiedad intelectual y licencia de contenido">
            <p>El responsable se reserva los derechos que le correspondan sobre el código fuente y la arquitectura que haya creado o adquirido legítimamente para IxmiPlace, así como sobre sus logotipos, diseño visual, textos editoriales y signos distintivos. Esta cláusula no afirma que una marca esté registrada. Los componentes de terceros conservan sus propias licencias y avisos; el uso de IxmiPlace no transfiere titularidad ni autoriza copiar, extraer, modificar o explotar comercialmente los elementos protegidos, salvo permiso legal o licencia aplicable.</p>
            <p>Conservas los derechos que te correspondan sobre tus publicaciones, fotografías y demás contenido. Para prestar el servicio, concedes al responsable una autorización no exclusiva, gratuita, limitada y revocable para alojar, reproducir técnicamente, adaptar al formato necesario y mostrar ese contenido dentro de IxmiPlace, y para que sus proveedores técnicos lo procesen con ese mismo fin. La autorización dura mientras el contenido esté activo y por el tiempo técnico razonable para retirar copias de caché o respaldos, sin perjuicio de conservación legal. No se autoriza su explotación publicitaria ajena al servicio.</p>
            <p>Si consideras que un contenido infringe tus derechos, escribe al correo de contacto con el enlace, identificación de la obra o derecho, explicación de la titularidad y medio para responder. Podemos ocultar temporalmente el material mientras revisamos el aviso y pedir información adicional para evitar retiros erróneos.</p>
          </TermsSection>

          <TermsSection title="7. Apoyo voluntario">
            <p>El apoyo mostrado en la página correspondiente es voluntario, se transfiere fuera de IxmiPlace y está destinado a apoyar a la mamá del creador. No es requisito para usar la plataforma ni compra una publicación, posición preferente o servicio. IxmiPlace no inicia, procesa, confirma ni revierte transferencias. Las gestiona el banco o Mercado Pago según sus propias condiciones. El apoyo es entre particulares y no se ofrece como donativo deducible ni genera recibo fiscal de IxmiPlace.</p>
          </TermsSection>

          <TermsSection title="8. Publicidad de negocios locales">
            <p>IxmiPlace puede mostrar anuncios patrocinados de negocios locales. La publicidad es general y no se selecciona mediante perfiles personales. Cada negocio es responsable de la veracidad y autorización de su nombre, imágenes, promociones, precios y enlaces. El responsable de IxmiPlace revisa y administra las campañas, pero no garantiza productos, servicios, disponibilidad, resultados ni ofertas del negocio.</p>
            <p>Las campañas se acuerdan directamente con el responsable de IxmiPlace por periodo y precio, y no se contratan ni cobran dentro de la aplicación. Un botón del anuncio puede llevar a un sitio o canal externo del negocio; al abrirlo, el visitante queda sujeto también a las condiciones y avisos de ese tercero. Las estadísticas informan conteos aproximados de impresiones y clics, no personas únicas ni resultados de venta.</p>
          </TermsSection>

          <TermsSection title="9. Disponibilidad, terceros y responsabilidad">
            <p>El servicio está en desarrollo y puede experimentar errores, mantenimiento, interrupciones, pérdida temporal de acceso o cambios de funciones. Procuraremos restablecerlo y proteger la información conforme a las medidas razonables disponibles, pero no ofrecemos disponibilidad ininterrumpida ni un servicio de respaldo o archivo permanente. Conserva copias de la información que necesites.</p>
            <p>IxmiPlace depende de proveedores externos de autenticación, alojamiento, base de datos, mapas, imágenes, mensajería y pagos. Sus servicios pueden variar o interrumpirse; los sitios externos se rigen por sus propios términos y avisos. No controlamos sus decisiones o disponibilidad. Esta cláusula no excluye la responsabilidad que legalmente corresponda al responsable de IxmiPlace por sus propios actos u omisiones.</p>
            <p>En la medida permitida por la ley, no respondemos por la veracidad de declaraciones de usuarios, actos de terceros ni acuerdos celebrados directamente entre ellos. Cada persona es responsable de sus actos, publicaciones y obligaciones. Nada en estos términos pretende excluir responsabilidad por dolo, negligencia atribuible, incumplimiento de deberes legales, daños que no puedan limitarse por ley, ni derechos irrenunciables de consumidores.</p>
          </TermsSection>

          <TermsSection title="10. Indemnización limitada">
            <p>Si una persona usuaria incumple materialmente estos términos, infringe derechos de terceros o realiza una conducta ilícita y ello genera un reclamo contra el responsable, se obliga, en la medida permitida por la legislación aplicable, a cooperar razonablemente y a responder por los daños directos que sean consecuencia comprobable de su conducta. Esta cláusula no impone renuncia a derechos, no cubre daños causados por el propio responsable y no obliga a pagar multas, sanciones o gastos que legalmente no puedan trasladarse.</p>
          </TermsSection>

          <TermsSection title="11. Cuenta, terminación y conservación">
            <p>Puedes dejar de usar IxmiPlace y solicitar eliminar tu cuenta desde el perfil. La eliminación desactiva el acceso y suprime o desasocia datos operativos conforme al Aviso de Privacidad; cierta información puede conservarse bloqueada por el tiempo necesario para obligaciones legales, seguridad o controversias. Publicaciones retiradas, mensajes enviados o copias descargadas previamente por terceros pueden no desaparecer de sus sistemas.</p>
            <p>Podemos suspender o terminar el acceso por incumplimientos, riesgos de seguridad o requerimiento legal, considerando la gravedad y procurando comunicar el motivo y la vía de revisión cuando sea legal y seguro hacerlo.</p>
          </TermsSection>

          <TermsSection title="12. Ley, jurisdicción y derechos de consumidores">
            <p>Estos términos se rigen por las leyes aplicables de los Estados Unidos Mexicanos. Si una controversia corresponde a tribunales, podrán conocer los órganos jurisdiccionales competentes de Hidalgo, incluido Ixmiquilpan cuando legalmente corresponda. Esta cláusula no impide acudir a PROFECO u otra autoridad competente, ni limita reglas imperativas de competencia territorial o derechos de consumidores.</p>
            <p>IxmiPlace no busca excluir la aplicación de la Ley Federal de Protección al Consumidor cuando resulte aplicable. Cualquier información sobre condiciones del servicio debe entenderse sin perjuicio de los derechos reconocidos por esa ley.</p>
          </TermsSection>

          <TermsSection title="13. Cambios y contacto">
            <p>Publicaremos nuevas versiones con fecha y número de versión, y procuraremos avisar con al menos 15 días naturales antes de un cambio material. Para cambios que alteren de forma relevante las reglas de uso, pediremos aceptación expresa antes de continuar con funciones de cuenta. Si un cambio inmediato es necesario por seguridad o por una obligación legal, podremos aplicarlo de inmediato e informarlo tan pronto como sea razonable. La falta de aceptación de una nueva versión puede impedir el acceso a funciones que dependan de ella, sin afectar derechos que la ley reconozca.</p>
            <p>Para preguntas, reclamos, reportes, solicitudes de revisión o avisos de propiedad intelectual, escribe a <a className="font-semibold text-brand-700 underline dark:text-brand-300" href="mailto:ixmiplacesupport@gmail.com">ixmiplacesupport@gmail.com</a>. El <Link className="font-semibold text-brand-700 underline dark:text-brand-300" to="/aviso-de-privacidad">Aviso de Privacidad Integral</Link> explica el tratamiento de datos y cómo ejercer derechos ARCO.</p>
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
