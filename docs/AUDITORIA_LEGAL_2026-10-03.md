# Auditoría legal de IxmiPlace

**Fecha:** 3 de octubre de 2026  
**Alcance:** revisión del Aviso de Privacidad y Términos implementados en `src/features/legal/PrivacyNoticePage.tsx` y `src/features/legal/TermsPage.tsx`, más los formularios de aceptación, versiones legales, endpoints y reglas de Firestore consultados en esta revisión.  
**Estado:** borrador de trabajo; no publicar mientras exista el marcador de domicilio pendiente.

> Este documento es una evaluación de riesgos basada en el código y los textos disponibles, no una opinión legal emitida por un abogado contratado, ni una garantía de resultado en juicio o ante autoridad. Nadie puede prometer que unas cláusulas reduzcan la responsabilidad “al 98%”: la responsabilidad depende de hechos, operación real, pruebas y normas imperativas.

## Hallazgos prioritarios

| Prioridad | Hallazgo | Riesgo práctico | Acción |
|---|---|---|---|
| Crítica antes de publicar | El aviso solo identificaba Ixmiquilpan, Hidalgo, sin un domicilio efectivo para localizar al responsable. La LFPDPPP vigente exige identidad y domicilio; la LFPC puede exigir domicilio físico, teléfono y medios de reclamación si la relación se considera de consumo electrónico. | Reclamo de falta de información obligatoria; la omisión impide sostener que el aviso está completo. | Obtener un domicilio real y operativo para recibir comunicaciones, y verificar con asesoría cómo proteger la residencia. Si LFPC aplica, confirmar también teléfono u otros canales exigibles. No inventar dirección ni publicar el marcador. |
| Alta | No se definían con suficiente claridad las finalidades primarias/secundarias y se usaba una aceptación genérica del Aviso como consentimiento. | Consentimiento poco específico o condicionado a una función esencial; confusión entre aviso recibido y autorización opcional. | Separar acuse de lectura del Aviso de los permisos opcionales. Publicidad secundaria debe tener negativa sencilla y no afectar el servicio esencial. |
| Alta | Se describía el almacenamiento del navegador, pero se afirmaba que el código propio no usaba `sessionStorage`; el flujo de verificación sí lo usa para conservar la hora del último envío. | Aviso inexacto frente al tratamiento real. | Corregido en el borrador de aviso. Mantener inventario actualizado de almacenamiento, cookies, SDKs y proveedores. |
| Alta | La sección ARCO no explicaba de manera completa qué documentos pueden solicitarse para acreditar identidad/representación, rectificación, respuesta y negativa. Indicaba “días hábiles”, que no es el texto literal del plazo de la ley nueva. | Procedimiento confuso y plazo descrito imprecisamente. | Se agregó proceso por correo, acreditación proporcional, documentos de rectificación, determinación en 20 días y ejecución en 15, con posible ampliación única justificada. |
| Alta | La descripción de transferencias y proveedores mezclaba proveedores técnicos, otros usuarios y servicios externos. | La persona no distingue quién recibe sus datos, para qué, ni qué se hace público. | Se separaron encargados técnicos, divulgación elegida a otros usuarios y servicios independientes (WhatsApp, FCM, banco/Mercado Pago). Verificar contratos, ubicaciones y prácticas actuales de cada proveedor. |
| Alta | El alcance de “dirección privada” y de App Check dependía de reglas y configuración de producción. Un aviso por sí solo no demuestra que reglas y migración estén desplegadas. | El aviso puede prometer un control que en producción no existe o que quedó incompleto. | La nueva redacción condiciona la afirmación a la revisión de reglas y migración. Auditar Firebase/Vercel y conservar evidencia de despliegue antes de afirmar que el dato está protegido. |
| Media-alta | No había proceso de aviso de incidentes de seguridad a titulares. | Incumplimiento de deberes de seguridad/notificación ante incidentes relevantes. | Añadida referencia al aviso inmediato si una vulneración afecta significativamente derechos patrimoniales o morales; hace falta procedimiento operativo de detección, evaluación, contención y notificación. |
| Media | Los términos no delimitaban los derechos sobre el código, marca, diseño e imágenes de plataforma. | Dificultad para detener copia/explotación o distinguir activos propios y licenciados. | Se añadieron reserva de derechos, reconocimiento de licencias de terceros y licencia limitada del contenido que sube cada usuario. Acreditar autoría/titularidad y revisar las licencias open source antes de alegar exclusividad. |
| Media | El proceso de retiro por reclamo de derechos y la revisión/apelación de moderación no estaban definidos. | Remoción inconsistente, queja por moderación arbitraria o falta de respuesta a una reclamación. | Se añadieron canales y datos mínimos para solicitar revisión. Implementar el flujo de atención y guardar sus decisiones. |
| Media | “Deslinde total” e indemnización ilimitada serían vulnerables si intentan excluir deberes propios, dolo/negligencia o derechos irrenunciables. | Cláusula potencialmente ineficaz y posible práctica abusiva, especialmente si hubiera relación de consumo. | No se incluyó exoneración absoluta. Se delimitó la responsabilidad de cada usuario y una indemnización por daños directos comprobables causados por incumplimiento, dentro de lo permitido por ley. |
| Media | La aceptación actual almacena versiones y horas de servidor en el perfil de usuario, un documento modificable; no es un registro append-only ni conserva una copia inmutable del texto aceptado. | La evidencia de quién aceptó qué texto es limitada si se discute autenticidad/integridad. | Mantener casillas desmarcadas y aceptación expresa; reforzar evidencia según “Implementación probatoria” abajo. |
| Media | El apoyo se denomina coloquialmente “donación”, pero es una transferencia entre particulares a una CLABE de Mercado Pago y no se emite recibo fiscal. | Expectativa errónea sobre destino, reembolso o deducibilidad fiscal. | Los términos y aviso explican que es apoyo voluntario externo, no compra y no deducible; confirmar que la pantalla de apoyo diga lo mismo. |

## Revisión del Aviso de Privacidad

### Aspectos que ya estaban presentes

- Identificaba al responsable persona física y un correo de contacto.
- Enumeraba cuenta, contacto, publicaciones, mensajes, favoritos, reportes y tokens push.
- Informaba que anuncios y fotos pueden ser públicos y que teléfono/dirección se separan.
- Mencionaba proveedores, finalidades, conservación, bloqueo y plazos ARCO.
- Había avisos contextuales en algunos formularios.

### Debilidades que se corrigieron en el borrador

- La falta de domicilio físico completo se hizo visible como un bloqueo previo a publicación; no se suplió con una dirección inventada.
- Se corrigió la omisión de `sessionStorage` y se precisó `localStorage`/persistencia de autenticación.
- Se distinguieron finalidades primarias y secundarias, así como los consentimientos de funciones opcionales.
- Se dividieron los destinatarios entre proveedores encargados, personas usuarias y proveedores externos que pueden ser responsables independientes.
- Se precisó que contenido público puede copiarse/indexarse y que una eliminación no retrae copias que terceros ya obtuvieron.
- Se mejoró el procedimiento ARCO y se eliminó la afirmación de “días hábiles”. La LFPDPPP publicada el 20 de marzo de 2025 prevé 20 días para comunicar determinación y 15 siguientes para hacerla efectiva; permite una ampliación justificada por un periodo igual.
- Se agregó la comunicación de incidentes relevantes conforme a la ley.

### Asuntos que aún dependen de datos/operación del responsable

1. **Domicilio:** completar una dirección real para recibir comunicaciones. Una oficina virtual, domicilio de representante o apartado podría requerir validación profesional; no se afirma que cualquiera de ellos baste automáticamente.
2. **Teléfono/canal de reclamaciones:** confirmar si IxmiPlace es proveedor en una transacción electrónica bajo LFPC y si se requiere publicar número telefónico, además del correo.
3. **Retención:** los documentos de límites llevan vencimiento, pero el endpoint revisado borra los vencidos cuando administración ejecuta la limpieza; no vi una ejecución automática programada. La nueva redacción aclara que ocho días es la fecha de vencimiento, no garantía de borrado automático. Ejecutar limpieza con una frecuencia definida y revisar los ciclos de Vercel, Firebase, Cloudinary y respaldos.
4. **Transferencias internacionales:** revisar ubicación/región, contratos y condiciones aplicables de Google/Firebase, Vercel y Cloudinary; informar cambios materiales.
5. **App Check:** al momento de esta revisión el código tiene proveedor Enterprise condicionado por variable de entorno. No se comprobó que la clave exista en Vercel, que Firebase esté registrando tokens válidos, ni que enforcement esté activo. No describirlo como control operativo hasta comprobarlo.
6. **Incidentes:** definir responsable, evaluación de afectación, evidencia, canal de contacto y plazo interno para comunicar.

## Revisión de Términos y Condiciones

- **Intermediación:** se aclaró que la plataforma facilita publicación/contacto y no actúa como parte de la renta/venta; la etiqueta no impide que una autoridad valore la función real del servicio.
- **Veracidad y transacciones:** se asigna al anunciante la obligación de tener autorización y mantener información actual; se recomienda a interesados verificar inmueble/contraparte. No se exonera al operador de sus propios actos u omisiones.
- **Disponibilidad:** se explica desarrollo, mantenimiento e interrupciones sin excluir obligaciones legales por fallas atribuibles.
- **Propiedad intelectual:** se reserva código/marca/diseño sin afirmar registros inexistentes; usuarios retienen su contenido y conceden una licencia no exclusiva y limitada para operar la plataforma y sus proveedores.
- **Retiro/moderación:** se permite intervención por riesgo/ilegalidad y se prevé revisión, pero debe existir canal y criterio operativo consistente.
- **Indemnización:** no es “de hierro”; se limita a daños directos comprobables causados por incumplimiento y no traslada daños, sanciones o gastos que legalmente no puedan transferirse.
- **Jurisdicción:** se mantiene México/Hidalgo con la salvedad de competencia obligatoria, PROFECO y derechos irrenunciables; no se impone renuncia general a otro fuero.
- **Apoyo:** se aclara que no es requisito/contraprestación, se transfiere fuera de IxmiPlace y no es deducible ni genera recibo fiscal del proyecto.
- **LFPC:** la app no cobra actualmente publicaciones ni procesa rentas. Aun así, si ofrece en los hechos un servicio a usuarios como proveedor, las reglas de comercio electrónico pueden aplicar. Una cláusula de “solo intermediario” no desplaza la ley.

## Implementación probatoria recomendada

1. Mantener casillas separadas, inicialmente desmarcadas, con enlaces visibles a las versiones completas. No aceptar mediante casillas premarcadas ni ocultar términos esenciales dentro de un enlace genérico.
2. Diferenciar aceptación de Términos, acuse/lectura del Aviso, confirmación de edad y consentimientos opcionales (teléfono público, notificaciones push, finalidades secundarias). La persona debe poder negar lo opcional sin perder funciones no relacionadas.
3. Conservar un evento de aceptación inmutable, por ejemplo `legalAcceptances/{uid}_{documentType}_{version}` creado por endpoint autenticado o reglas que prohíban update/delete. Incluir UID, tipo y versión, fecha/hora del servidor, acción concreta, versión de interfaz, idioma, estado de casillas y hash SHA-256 del documento final aceptado.
4. Guardar una copia versionada del texto y permitir que la persona descargue o vuelva a consultar el documento aceptado. El hash por sí solo no sustituye conservar el texto.
5. **No guardar IP en bruto por defecto.** La IP no es requisito general para probar clickwrap y amplía el riesgo/obligaciones de privacidad. Si una necesidad antifraude justifica conservar un hash seudonimizado, informar finalidad, retención, controles de acceso y eliminación; un hash vinculable también puede ser dato personal.
6. Registrar retiro/revocación de consentimientos opcionales como evento separado, con fecha/hora y efecto (token push eliminado, teléfono oculto, etc.).
7. Obtener acuse legible de cada cambio material y no reemplazar el historial previo. Antes del despliegue, actualizar en conjunto front-end, endpoints, reglas de Firestore y número de versión; las cuentas antiguas deben ver la pantalla de reaceptación.
8. Generar un resumen accesible al usuario y conservar comprobante por correo si la fricción es aceptable; no enviar comunicaciones promocionales como parte de un consentimiento obligatorio.

En el estado actual del proyecto, las casillas se controlan desde React y empiezan sin marcar; el registro guarda versiones y `serverTimestamp()` en el documento de perfil. Eso es un rastro útil, pero no equivale todavía al expediente inmutable recomendado. Los registros de seguridad de endpoints usan hash de IP; no son el log de aceptación.

## Fuentes oficiales consultadas

- [LFPDPPP vigente (Cámara de Diputados, texto PDF)](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) y [decreto publicado en el DOF el 20 de marzo de 2025](https://www.dof.gob.mx/nota_detalle.php?codigo=5752569&fecha=20/03/2025).
- [LFPC vigente (Cámara de Diputados)](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf), en particular arts. 76 Bis y 76 Bis 1.
- [Código Civil Federal vigente (Cámara de Diputados)](https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf), en particular consentimiento expreso/tácito y forma electrónica (arts. 1803 y 1834 Bis).
- [Ley Federal del Derecho de Autor vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFDA.pdf), respecto de derechos morales y patrimoniales.
