import { auth } from './firebase';

interface ContactResponse {
  url: string;
}

export async function requestListingWhatsApp(listingId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    throw new Error('Inicia sesión y verifica tu correo para consultar el contacto.');
  }
  const idToken = await user.getIdToken();

  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
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
