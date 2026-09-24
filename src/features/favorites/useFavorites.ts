import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  writeBatch,
  increment,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Favorite, Listing } from '../../types/models';

/**
 * Hook que expone el estado de favoritos del usuario actual.
 *
 * Uso:
 *   const { isFavorite, toggleFavorite, count, favorites } = useFavorites();
 */
export function useFavorites() {
  const { fbUser } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Suscripción en tiempo real a los favoritos del usuario
  useEffect(() => {
    if (!fbUser) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', fbUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data() as Favorite;
          ids.add(data.listingId);
        });
        setFavoriteIds(ids);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando favoritos:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [fbUser]);

  // Verifica si una publicación es favorita
  const isFavorite = useCallback(
    (listingId: string) => favoriteIds.has(listingId),
    [favoriteIds]
  );

  // Toggle: añadir o quitar de favoritos, Y actualizar el contador
  // favoritesCount del listing en la MISMA operación atómica (writeBatch).
  // Si cualquiera de las dos escrituras fallara, ninguna se aplica.
  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!auth.currentUser) {
        throw new Error('Debes iniciar sesión para guardar favoritos');
      }

      const favId = `${auth.currentUser.uid}_${listingId}`;
      const favRef = doc(db, 'favorites', favId);
      const listingRef = doc(db, 'listings', listingId);

      const batch = writeBatch(db);

      if (favoriteIds.has(listingId)) {
        // Ya es favorito → eliminar + decrementar contador
        batch.delete(favRef);
        batch.update(listingRef, { favoritesCount: increment(-1) });
      } else {
        // No es favorito → crear + incrementar contador
        const newFavorite: Omit<Favorite, 'id'> = {
          userId: auth.currentUser.uid,
          listingId,
          createdAt: Date.now(),
        };
        batch.set(favRef, newFavorite);
        batch.update(listingRef, { favoritesCount: increment(1) });
      }

      await batch.commit();

      // 🔍 Log temporal de verificación — bórralo cuando confirmes que funciona
      const check = await getDoc(listingRef);
      console.log('🔥 favoritesCount después del batch:', check.data()?.favoritesCount);
    },
    [favoriteIds]
  );

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    count: favoriteIds.size,
    loading,
  };
}

/**
 * Hook para obtener las publicaciones favoritas COMPLETAS (no solo IDs).
 * Se usa en la página /favoritos.
 */
export function useFavoriteListings() {
  const { fbUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fbUser) {
      setListings([]);
      setLoading(false);
      return;
    }

    // 1. Suscribirse a los favoritos del usuario
    const favQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', fbUser.uid)
    );

    const unsub = onSnapshot(
      favQuery,
      async (snap) => {
        if (snap.empty) {
          setListings([]);
          setLoading(false);
          return;
        }

        // 2. Para cada favorito, traer el listing
        const favoriteDocs = [...snap.docs].sort(
          (a, b) => (b.data() as Favorite).createdAt - (a.data() as Favorite).createdAt
        );
        const listingIds = favoriteDocs.map(
          (d) => (d.data() as Favorite).listingId
        );

        try {
          const listingPromises = listingIds.map((id) =>
            getDoc(doc(db, 'listings', id))
          );
          const listingSnaps = await Promise.all(listingPromises);

          const data: Listing[] = listingSnaps
            .filter((s) => s.exists())
            .map((s) => ({
              id: s.id,
              ...(s.data() as Omit<Listing, 'id'>),
            }));

          setListings(data);
        } catch (err) {
          console.error('Error cargando listings favoritos:', err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error cargando favoritos:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [fbUser]);

  return { listings, loading };
}