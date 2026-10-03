# Configuración de notificaciones push

IxmiPlace usa Firebase Cloud Messaging para los dispositivos y una función HTTP de Vercel para enviar avisos. No usa Firebase Cloud Functions y no requiere activar Blaze.

## Variables de Vercel

En Project → Settings → Environment Variables agrega las variables siguientes para Production y Preview:

| Variable | Valor |
| --- | --- |
| `VITE_FB_VAPID_KEY` | Clave pública Web Push de Firebase; se obtiene en Project settings → Cloud Messaging → Web Push certificates. |
| `FIREBASE_ADMIN_PROJECT_ID` | `ixmiplace` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Corre de una cuenta de servicio dedicada de Google Cloudo. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Clave privada de esa cuenta. Solo del lado servidor; nunca usar prefijo `VITE_`. |
| `APP_ORIGIN` | `https://ixmiplace.vercel.app` (o el origen canónico si se configura un dominio propio). |

Para las credenciales privadas, crea una cuenta de servicio dedicada en Google Cloud IAM, asígnale `Cloud Datastore User` (`roles/datastore.user`) para leer/escribir documentos y `Firebase Cloud Messaging Service Editor` (`roles/cloudmessaging.editor`) para enviar push, y crea una clave JSON. Copia `project_id`, `client_email` y `private_key` a las tres variables `FIREBASE_ADMIN_*` de Vercel. No subas el JSON ni la clave a Git, al frontend o al chat. Estas credenciales pueden acceder a datos de Firestore y deben quedar exclusivamente en Vercel.

## Publicar y activar

1. Antes de publicar, completa el domicilio del responsable en el Aviso de Privacidad. Después publica en Firebase Console el contenido actualizado de `firestore.rules`; esta versión exige aceptación de Términos `2026-10-03-v4` y Aviso de Privacidad `2026-10-03-v7` y permite que cada cuenta gestione solo sus propios tokens push.
2. Guarda las variables de Vercel y vuelve a desplegar la rama de producción.
3. Cada usuario debe entrar, aceptar la versión nueva del aviso, abrir **Notificaciones** y pulsar **Activar notificaciones**. También debe aceptar el permiso del navegador.
4. En iPhone/iPad, instala IxmiPlace desde **Compartir → Añadir a pantalla de inicio** y activa push desde la PWA instalada (iOS/iPadOS 16.4 o posterior).

Los anuncios nuevos pendientes y los reportes avisan a las cuentas administradoras; los mensajes nuevos y las decisiones de moderación avisan a la persona destinataria. El texto de los mensajes no se incluye en las notificaciones de pantalla.

Firebase Cloud Messaging aparece como servicio sin costo en Firebase. Vercel Hobby incluye funciones dentro de sus límites; al superar límites, Hobby puede pausar el uso, por lo que no se activa facturación por excedentes automáticamente según su documentación actual. Revisa Usage en Vercel mientras IxmiPlace crece.
