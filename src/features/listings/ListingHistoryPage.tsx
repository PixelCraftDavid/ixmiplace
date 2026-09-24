import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, Loader2, History } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { ListingHistoryEntry } from '../../types/models';

export function ListingHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { fbUser, profile } = useAuth();
  const [history, setHistory] = useState<ListingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !fbUser) return;
    const historyQuery = query(
      collection(db, 'listingHistory'),
      where('listingId', '==', id)
    );
    return onSnapshot(historyQuery, (snapshot) => {
      const entries = snapshot.docs.map((historyDoc) => ({
        id: historyDoc.id,
        ...(historyDoc.data() as Omit<ListingHistoryEntry, 'id'>),
      }));
      entries.sort((a, b) => b.createdAt - a.createdAt);
      setHistory(entries);
      setLoading(false);
    }, (error) => {
      console.error('Error cargando historial:', error);
      setLoading(false);
    });
  }, [fbUser, id]);

  if (!profile || !fbUser) return null;

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-3xl py-8">
        <Link to="/mis-publicaciones" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-700"><ArrowLeft className="h-4 w-4" /> Volver a mis publicaciones</Link>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><History className="h-6 w-6" /></div>
          <div><h1 className="text-3xl font-extrabold text-ink">Historial de cambios</h1><p className="mt-1 text-sm text-ink-500">Registro de actividad de esta publicación.</p></div>
        </div>

        {loading ? <div className="flex justify-center py-20 text-ink-400"><Loader2 className="h-8 w-8 animate-spin" /></div> : history.length === 0 ? <div className="rounded-2xl border border-cream-200 bg-white p-10 text-center text-sm text-ink-500">Todavía no hay cambios registrados.</div> : <div className="space-y-3">{history.map((entry) => <article key={entry.id} className="flex gap-4 rounded-2xl border border-cream-200 bg-white p-5 shadow-sm"><div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Clock3 className="h-4 w-4" /></div><div><p className="font-semibold text-ink">{entry.summary}</p><p className="mt-1 text-xs text-ink-400">{new Date(entry.createdAt).toLocaleString('es-MX')}</p>{entry.changedFields.length > 0 && <p className="mt-2 text-sm text-ink-500">Campos: {entry.changedFields.join(', ')}</p>}</div></article>)}</div>}
      </div>
    </main>
  );
}