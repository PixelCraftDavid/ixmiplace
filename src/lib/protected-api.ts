import { getToken as getAppCheckToken } from 'firebase/app-check';
import { appCheck, auth } from './firebase';

export async function postProtectedApi<T>(path: string, payload: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw new Error('Inicia sesión y verifica tu correo.');
  if (!appCheck) throw new Error('La protección App Check no está configurada.');

  const [idToken, appCheckResult] = await Promise.all([
    user.getIdToken(),
    getAppCheckToken(appCheck),
  ]);
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'X-Firebase-AppCheck': appCheckResult.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(result?.error ?? 'La solicitud protegida falló.');
  if (!result) throw new Error('Respuesta del servidor inválida.');
  return result;
}

// The internal-message endpoint uses Firebase Authentication plus server-side
// validation, ownership checks, and rate limits; it does not require App Check.
export async function postAuthenticatedApi<T>(path: string, payload: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw new Error('Inicia sesión y verifica tu correo.');
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + idToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(result?.error ?? 'No se pudo completar la solicitud.');
  if (!result) throw new Error('Respuesta del servidor inválida.');
  return result;
}
