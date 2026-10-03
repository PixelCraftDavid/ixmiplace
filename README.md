# IxmiPlace

Marketplace de anuncios para Ixmiquilpan, construido con React, TypeScript, Vite, Firebase y Vercel.

## Desarrollo

```powershell
npm install
npm run dev
```

El build de producción se valida con `npm run build`. Los endpoints `/api/*` viven en Vercel; para probarlos localmente instala Vercel CLI y usa `vercel dev` con las variables de entorno necesarias.

## Seguridad de contacto e imágenes

- WhatsApp debe vivir en `listingPrivateDetails/{listingId}`, nunca en `listings/{listingId}`.
- `/api/contact` valida Firebase Auth, correo verificado, App Check, consentimiento, estado/vigencia del anuncio y cuotas por usuario/anuncio/IP.
- `/api/message` valida Firebase Auth, correo verificado, consentimiento, publicación vigente y cuotas; no requiere App Check.
- `/api/push` valida Firebase Auth y que el evento corresponda a un documento autorizado; no requiere App Check.
- `/api/report`, `/api/metric`, `/api/cloudinary-signature`, `/api/delete-account` y `/api/cleanup-rate-limits` siguen validando App Check y aplican sus propias reglas/cuotas.
- La eliminación de cuenta vuelve a autenticar al usuario, exige una sesión reciente y elimina primero sus anuncios, medios, contactos privados y datos relacionados; Firebase Auth se elimina al final para permitir reintentar si una operación falla.
- La subida de imágenes se firma en servidor. El secreto de Cloudinary solo va en variables de Vercel sin prefijo `VITE_`.
- El navegador valida firma de archivo y rasteriza JPG/PNG/WebP a JPEG antes de subir. Firestore solo acepta URLs del Cloudinary configurado.
- Firebase Rules son la autoridad para acceso a datos. La UI y validaciones Zod no sustituyen reglas del servidor.

## Variables de entorno

Frontend (`.env.local` o Vercel):

- `VITE_FB_API_KEY`
- `VITE_FB_AUTH_DOMAIN`
- `VITE_FB_PROJECT_ID`
- `VITE_FB_STORAGE_BUCKET`
- `VITE_FB_SENDER_ID`
- `VITE_FB_APP_ID`
- `VITE_FB_VAPID_KEY`
- `VITE_FB_APPCHECK_SITE_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`

Solo servidor Vercel, nunca `VITE_*`:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `APP_ORIGIN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_SIGNED_UPLOAD_PRESET`

## Puesta en producción segura

1. `VITE_FB_APPCHECK_SITE_KEY` solo se necesita para las funciones que todavía usan App Check, como reportes, firma de imágenes y eliminación de cuenta. El mensaje interno y la entrega push no lo requieren. Revisa precios y cuotas antes de configurar un proveedor de App Check.
2. En Cloudinary crea un preset firmado que solo permita `jpg`, `png` y `webp`, tamaño máximo de 5 MB, carpeta `ixmiplace/listings` y sin sobrescritura. Configura las variables secretas en Vercel.
3. Desactiva el preset unsigned antiguo después de desplegar la versión que usa `/api/cloudinary-signature`; de otro modo alguien podría seguir subiendo directamente con el preset público antiguo.
4. Despliega la aplicación y las APIs de Vercel.
5. Inicia sesión como admin, acepta las versiones vigentes de Términos y Aviso de Privacidad y ejecuta una sola vez **Migrar y archivar vencidos**. La API mueve WhatsApp/direcciones legadas fuera de las fichas públicas.
6. Comprueba el resumen: cualquier teléfono inválido se debe corregir manualmente antes de cerrar el acceso público a esos datos.
7. Solo después publica `firestore.rules` con `firebase deploy --only firestore:rules`.
8. En Firebase App Check, observa las métricas y luego habilita enforcement para Firestore. No lo fuerces antes de confirmar que producción y desarrollo obtienen tokens válidos.
9. Limpia los contadores vencidos manualmente desde el panel de administración. No actives TTL ni una tarea programada de Firebase: el botón procesa una cantidad limitada por pasada y puedes repetirlo si quedan registros.
10. Mantén Firebase en Spark y Vercel en Hobby; el proyecto no usa Cloud Functions. Revisa sus cuotas gratuitas: al agotarse, las operaciones pueden fallar o pausarse. No habilites facturación para este flujo.
11. En Vercel protege las variables y revisa los logs. Un DDoS grande no puede garantizarse gratis con código frontend; usa la protección de red incluida por el proveedor y detén o limita el servicio si se agotan sus cuotas.

No despliegues las reglas finales antes de ejecutar la migración: las reglas no pueden ocultar selectivamente el campo `whatsapp` dentro de documentos antiguos. App Check y límites reducen automatización, pero no hacen imposible un ataque distribuido ni garantizan que todos los usuarios humanos sean confiables.

## Eliminación de cuenta

El usuario puede ir a **Editar perfil → Eliminar mi cuenta**, confirmar escribiendo `ELIMINAR` y volver a autenticarse. El servidor exige App Check, token válido y autenticación de los últimos cinco minutos. Elimina anuncios y medios propios, documentos privados, favoritos, reportes enviados, mensajes/notificaciones/historial asociados, tokens push, límites atribuibles a la cuenta y perfiles; la cuenta de Firebase Auth se borra al final. Los contadores agregados de IP están seudonimizados y no se pueden atribuir de forma fiable a una cuenta concreta.
