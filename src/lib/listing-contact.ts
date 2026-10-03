import { getToken } from 'firebase/app-check';
import { auth, appCheck } from './firebase';

interface ContactResponse {
  url: string;
}

export async function requestListingWhatsApp(listingId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    throw new Error('Inicia sesión y verifica tu correo para consultar el contacto.');
  }
  if (!appCheck) {
    throw new Error('La protección App Check aún no está configurada. Usa el mensaje interno por ahora.');
  }

  const [idToken, appCheckResult] = await Promise.all([
    user.getIdToken(),
    getToken(appCheck),
  ]);

  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'X-Firebase-AppCheck': appCheckResult.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listingId }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null) as ContactResponse | { error?: string } | null;
  if (!response.ok) {
    throw new Error(data && 'error' in data && data.error ? data.error : 'No se pudo obtener el contacto.');
  }
  if (!data || !('url' in data) || typeof data.url !== 'string') {
    throw new Error('Respuesta de contacto inválida.');
  }
  return data.url;
}