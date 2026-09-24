import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

type ListingMetric = 'viewsCount' | 'whatsappContactsCount';

export function trackListingMetric(
  listingId: string,
  metric: ListingMetric
): void {
  const storageKey = `ixmiplace:metric:${metric}:${listingId}`;

  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
  } catch {
    // La métrica continúa aunque el navegador bloquee localStorage.
  }

  void updateDoc(doc(db, 'listings', listingId), {
    [metric]: increment(1),
  }).catch((error) => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignorar errores del almacenamiento local.
    }
    console.error(`Error registrando métrica ${metric}:`, error);
  });
}