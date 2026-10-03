import { getToken as getAppCheckToken } from 'firebase/app-check';
import { appCheck, auth } from './firebase';

export interface ContactMigrationResult {
  ok: true;
  scanned: number;
  phonesMoved: number;
  addressesMoved: number;
  invalidPhones: number;
}

export async function migratePrivateContacts(): Promise<ContactMigrationResult> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw new Error('Inicia sesión con la cuenta admin y verifica el correo.');
  if (!appCheck) throw new Error('Configura App Check antes de ejecutar la migración.');

  const [idToken, appCheckResult] = await Promise.all([
    user.getIdToken(true),
    getAppCheckToken(appCheck, true),
  ]);
  const response = await fetch('/api/migrate-private-contact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'X-Firebase-AppCheck': appCheckResult.token,
      'Content-Type': 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as ContactMigrationResult | { error?: string } | null;
  if (!response.ok) {
    throw new Error(result && 'error' in result && result.error ? result.error : 'La migración de datos privados falló.');
  }
  return result as ContactMigrationResult;
}
