/**
 * Advertencia anti self-XSS para la consola del navegador.
 * Se muestra una sola vez al arrancar la app (solo en producción).
 *
 * Uso en src/main.tsx:
 *   import { showConsoleWarning } from './lib/consoleWarning';
 *   showConsoleWarning();
 */
export function showConsoleWarning(): void {
  if (!import.meta.env.PROD) return;

  console.log(
    '%c¡Alto ahí!',
    'color:#dc2626;font-size:48px;font-weight:800;text-shadow:1px 1px 0 #000;'
  );
  console.log(
    '%cEsta consola es una herramienta para desarrolladores.\n\n' +
      'Si alguien te pidió pegar aquí un texto o código para "activar" una función ' +
      'secreta de IxmiPlace, publicar gratis, ver datos de otros usuarios o entrar a ' +
      'la cuenta de alguien más, es una estafa. Ese código le dará a esa persona ' +
      'control total de TU cuenta.\n\n' +
      'Si no sabes exactamente qué hace lo que vas a pegar, cierra esta ventana.',
    'font-size:16px;line-height:1.5;color:#111827;'
  );
}