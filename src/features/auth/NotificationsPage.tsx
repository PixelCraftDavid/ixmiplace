import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Check, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import type { AppNotification } from '../../types/models';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSubscriptionState,
} from '../../lib/push-notifications';

export function NotificationsPage() {
  const { fbUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushState, setPushState] = useState<'loading' | 'unsupported' | 'denied' | 'enabled' | 'disabled'>('loading');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

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

  useEffect(() => {
    if (!fbUser) return;
    let cancelled = false;
    void getPushSubscriptionState(fbUser.uid).then((state) => {
      if (!cancelled) setPushState(state);
    });

    return () => {
      cancelled = true;
    };
  }, [fbUser]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  async function markAsRead(notification: AppNotification) {
    if (notification.isRead) return;
    await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
  }

  async function togglePushNotifications() {
    if (!fbUser) return;
    setPushBusy(true);
    setPushError('');
    try {
      if (pushState === 'enabled') {
        await disablePushNotifications(fbUser.uid);
        setPushState('disabled');
      } else {
        await enablePushNotifications(fbUser.uid);
        setPushState('enabled');
      }
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'No se pudo actualizar la configuración.');
      if ('Notification' in window && Notification.permission === 'denied') setPushState('denied');
    } finally {
      setPushBusy(false);
    }
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

        <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-amber-50 p-5 shadow-sm dark:border-brand-900/50 dark:from-brand-900/20 dark:via-[#293027] dark:to-amber-900/10 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm dark:bg-[#1c211a] dark:text-brand-300">
              {pushState === 'enabled' ? <CheckCircle2 className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
            </span>
            <div>
              <h2 className="font-bold text-ink-800 dark:text-ink-50">Avisos en tu dispositivo</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-500 dark:text-ink-300">
                Si las activas, guardaremos un identificador técnico de este dispositivo para avisarte de mensajes, cambios en tus publicaciones y novedades de IxmiPlace. Las alertas no muestran el contenido de tus mensajes. Puedes desactivarlas aquí; consulta el <Link to="/aviso-de-privacidad" className="font-semibold text-brand-700 underline dark:text-brand-300">Aviso de Privacidad</Link>.
              </p>
              {pushState === 'unsupported' && <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">Este navegador no admite notificaciones push.</p>}
              {pushState === 'denied' && <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">El permiso está bloqueado. Puedes habilitarlo desde los ajustes del sitio en tu navegador.</p>}
              {pushError && <p role="alert" className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">{pushError}</p>}
            </div>
          </div>
          {pushState !== 'unsupported' && pushState !== 'denied' && (
            <button
              type="button"
              onClick={() => void togglePushNotifications()}
              disabled={pushBusy || pushState === 'loading'}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${pushState === 'enabled' ? 'border border-cream-300 bg-white text-ink-700 hover:bg-cream-50 dark:border-[#4b5847] dark:bg-[#1c211a] dark:text-ink-100 dark:hover:bg-[#323a30]' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
            >
              {pushBusy || pushState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              {pushState === 'enabled' ? 'Desactivar en este dispositivo' : 'Activar notificaciones'}
            </button>
          )}
        </section>

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
                  <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${notification.type === 'listing_approved' ? 'bg-emerald-50 text-emerald-600' : notification.type === 'listing_removed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {notification.type === 'listing_approved' ? <Check className="h-5 w-5" /> : notification.type === 'listing_removed' ? <Trash2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-bold text-ink">{notification.title}</h2>
                      <time className="text-xs text-ink-400">{new Date(notification.createdAt).toLocaleString('es-MX')}</time>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{notification.message}</p>
                    <div className="mt-3 flex items-center gap-3">
                      {notification.type !== 'listing_removed' && <Link to={`/listing/${notification.listingId}`} onClick={() => void markAsRead(notification)} className="text-sm font-semibold text-brand-600 hover:text-brand-700">Ver publicación</Link>}
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
