import { getToken as getAppCheckToken } from 'firebase/app-check';
import { appCheck, auth } from './firebase';

type ListingMetric = 'viewsCount';

export function trackListingMetric(
  listingId: string,
  metric: ListingMetric
): void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !appCheck) return;

  const storageKey = `ixmiplace:metric:${metric}:${listingId}`;

  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
  } catch {
    // La métrica continúa aunque el navegador bloquee localStorage.
  }

  void Promise.all([user.getIdToken(), getAppCheckToken(appCheck)])
    .then(([idToken, appCheckResult]) => fetch('/api/metric', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'X-Firebase-AppCheck': appCheckResult.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listingId, metric }),
      cache: 'no-store',
    }))
    .then(async (response) => {
      if (!response.ok) throw new Error(`Metric API returned ${response.status}`);
      const result = await response.json() as { counted?: boolean };
      if (!result.counted) return;
    })
    .catch((error) => {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignorar errores de almacenamiento local.
      }
      console.error(`Error registrando métrica ${metric}:`, error);
    });
}