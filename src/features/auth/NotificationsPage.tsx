import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Loader2 } from 'lucide-react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import type { AppNotification } from '../../types/models';

export function NotificationsPage() {
  const { fbUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fbUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', fbUser.uid)
    );

    return onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((notificationDoc) => ({
          id: notificationDoc.id,
          ...(notificationDoc.data() as Omit<AppNotification, 'id'>),
        }));
        data.sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error cargando notificaciones:', error);
        setLoading(false);
      }
    );
  }, [fbUser]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  async function markAsRead(notification: AppNotification) {
    if (notification.isRead) return;
    await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
  }

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-3xl py-8">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Bell className="h-3.5 w-3.5" /> Avisos de tu cuenta
            </div>
            <h1 className="text-3xl font-extrabold text-ink">Notificaciones</h1>
            <p className="mt-2 text-ink-500">Aquí verás las novedades de tus publicaciones.</p>
          </div>
          {unreadCount > 0 && <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white">{unreadCount} nuevas</span>}
        </header>

        {loading ? (
          <div className="flex justify-center py-24 text-ink-400"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-sm">
            <Bell className="mx-auto h-10 w-10 text-brand-400" />
            <h2 className="mt-4 text-xl font-bold text-ink">Sin notificaciones</h2>
            <p className="mt-2 text-sm text-ink-500">Cuando haya novedades aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article key={notification.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${notification.isRead ? 'border-cream-200' : 'border-brand-200 ring-2 ring-brand-500/10'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${notification.type === 'listing_approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {notification.type === 'listing_approved' ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-bold text-ink">{notification.title}</h2>
                      <time className="text-xs text-ink-400">{new Date(notification.createdAt).toLocaleString('es-MX')}</time>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{notification.message}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <Link to={`/listing/${notification.listingId}`} onClick={() => void markAsRead(notification)} className="text-sm font-semibold text-brand-600 hover:text-brand-700">Ver publicación</Link>
                      {!notification.isRead && <button type="button" onClick={() => void markAsRead(notification)} className="text-sm font-medium text-ink-500 hover:text-ink-700">Marcar como leída</button>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}