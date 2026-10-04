import { useEffect, useState } from 'react';
import { CalendarDays, Check, Mail, Printer, X, Loader2 } from 'lucide-react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import type { InternalMessage } from '../../types/models';

type MessageFolder = 'received' | 'sent';

export function MessagesPage() {
  const { fbUser } = useAuth();
  const [received, setReceived] = useState<InternalMessage[]>([]);
  const [sent, setSent] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<MessageFolder>('received');
  const [printTarget, setPrintTarget] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!fbUser) return;
    let receivedReady = false;
    let sentReady = false;
    const receivedQuery = query(collection(db, 'messages'), where('recipientId', '==', fbUser.uid));
    const sentQuery = query(collection(db, 'messages'), where('senderId', '==', fbUser.uid));
    const stopReceived = onSnapshot(receivedQuery, (snapshot) => {
      const data = snapshot.docs.map((messageDoc) => ({ id: messageDoc.id, ...(messageDoc.data() as Omit<InternalMessage, 'id'>) }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setReceived(data);
      receivedReady = true;
      if (sentReady) setLoading(false);
    }, (error) => {
      console.error('Error cargando mensajes recibidos:', error);
      receivedReady = true;
      setLoading(false);
    });
    const stopSent = onSnapshot(sentQuery, (snapshot) => {
      const data = snapshot.docs.map((messageDoc) => ({ id: messageDoc.id, ...(messageDoc.data() as Omit<InternalMessage, 'id'>) }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setSent(data);
      sentReady = true;
      if (receivedReady) setLoading(false);
    }, (error) => {
      console.error('Error cargando mensajes enviados:', error);
      sentReady = true;
      setLoading(false);
    });
    return () => { stopReceived(); stopSent(); };
  }, [fbUser]);

  async function markRead(message: InternalMessage) {
    if (message.status === 'read') return;
    await updateDoc(doc(db, 'messages', message.id), { status: 'read' });
  }

  async function setAppointmentStatus(message: InternalMessage, status: 'confirmed' | 'cancelled') {
    setActionError('');
    try {
      await updateDoc(doc(db, 'messages', message.id), { visitStatus: status });
    } catch (error) {
      console.error('No se pudo actualizar la solicitud de visita:', error);
      setActionError('No se pudo actualizar la solicitud. Actualiza la página e inténtalo de nuevo.');
    }
  }

  function printAppointment(messageId: string) {
    setPrintTarget(messageId);
    window.setTimeout(() => window.print(), 100);
  }

  const activeMessages = folder === 'received' ? received : sent;
  const appointmentCount = received.filter((message) => message.visitStatus === 'requested').length;

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-3xl py-8">
        <header className="mb-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"><Mail className="h-3.5 w-3.5" /> Contacto privado</div>
          <h1 className="text-3xl font-extrabold text-ink">Mensajes y visitas</h1>
          <p className="mt-2 text-ink-500">Lee mensajes, coordina citas y consulta tus confirmaciones.</p>
        </header>

        <div className="mb-5 flex gap-2 rounded-xl border border-cream-200 bg-white p-1.5">
          <button type="button" onClick={() => setFolder('received')} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${folder === 'received' ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-cream-50'}`}>Recibidos{appointmentCount > 0 ? ` · ${appointmentCount} por responder` : ''}</button>
          <button type="button" onClick={() => setFolder('sent')} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${folder === 'sent' ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-cream-50'}`}>Enviados</button>
        </div>

        {actionError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
        {loading ? (
          <div className="flex justify-center py-24 text-ink-400"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : activeMessages.length === 0 ? (
          <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-sm">
            <Mail className="mx-auto h-10 w-10 text-brand-400" />
            <h2 className="mt-4 text-xl font-bold text-ink">{folder === 'received' ? 'Aún no tienes mensajes' : 'Aún no has enviado mensajes'}</h2>
            <p className="mt-2 text-sm text-ink-500">{folder === 'received' ? 'Los interesados podrán escribirte desde el detalle de tus propiedades.' : 'Tus solicitudes de visita y mensajes aparecerán aquí.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMessages.map((message) => {
              const isPrintTarget = printTarget === message.id;
              return (
                <article key={message.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${isPrintTarget ? 'print-target' : ''} ${message.status === 'unread' && folder === 'received' ? 'border-brand-200 ring-2 ring-brand-500/10' : 'border-cream-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Mail className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-bold text-ink">{message.subject}</h2>
                        <time className="text-xs text-ink-400">{new Date(message.createdAt).toLocaleString('es-MX')}</time>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-brand-700">{folder === 'received' ? message.senderName : `Para el propietario · ${message.listingTitle ?? 'Publicación'}`}</p>
                      {folder === 'received' && message.listingTitle && <p className="mt-1 text-xs text-ink-400">Anuncio: {message.listingTitle} · {message.listingColonia}</p>}
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">{message.message}</p>

                      {message.visitRequestedAt && <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">Visita solicitada: {new Date(message.visitRequestedAt).toLocaleString('es-MX')}</p>}
                      {message.openHouseRsvp && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Solicitud para asistir a la casa abierta.</p>}

                      {folder === 'received' && message.visitStatus === 'requested' && (
                        <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/70 p-3 print-hide">
                          <p className="text-sm font-semibold text-brand-900"><CalendarDays className="mr-1 inline h-4 w-4" />Solicitud de visita pendiente</p>
                          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                            <button type="button" onClick={() => void setAppointmentStatus(message, 'confirmed')} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"><Check className="h-4 w-4" />Confirmar cita</button>
                            <button type="button" onClick={() => void setAppointmentStatus(message, 'cancelled')} className="inline-flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-cream-50"><X className="h-4 w-4" />Rechazar</button>
                          </div>
                        </div>
                      )}
                      {message.visitStatus === 'confirmed' && (
                        <div className="appointment-ticket mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-sm font-bold text-emerald-900"><Check className="mr-1 inline h-4 w-4" />Cita confirmada</p>
                          <p className="mt-2 text-sm text-emerald-900">{message.listingTitle ?? 'Visita a la propiedad'}</p>
                          {message.listingColonia && <p className="text-sm text-emerald-800">Zona: {message.listingColonia}, Ixmiquilpan</p>}
                          {message.appointmentStartAt && <p className="mt-1 text-sm text-emerald-900">{new Date(message.appointmentStartAt).toLocaleString('es-MX')}{message.appointmentEndAt ? ` – ${new Date(message.appointmentEndAt).toLocaleString('es-MX')}` : ''}</p>}
                          <p className="mt-2 text-xs text-emerald-800">A nombre de: {message.senderName} · Folio: {message.id.slice(0, 8).toUpperCase()}</p>
                          <p className="mt-2 text-xs text-emerald-800">Esta confirmación no acredita identidad. No incluye dirección exacta, teléfono ni correo; acuerda el punto de encuentro con el propietario.</p>
                          {folder === 'sent' && <button type="button" onClick={() => printAppointment(message.id)} className="print-hide mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 print:hidden"><Printer className="h-4 w-4" />Imprimir confirmación</button>}
                          <section className="appointment-print-sheet" aria-hidden="true">
                            <img className="appointment-print-watermark" src="/logo-ixmiplace.jpg" alt="" />
                            <header className="appointment-print-header">
                              <div className="appointment-print-brand"><img src="/logo-ixmiplace.jpg" alt="" /><div><strong>IxmiPlace</strong><span>COMPROBANTE DE VISITA</span></div></div>
                              <span className="appointment-print-status">CITA CONFIRMADA</span>
                            </header>
                            <p className="appointment-print-eyebrow">{message.openHouseRsvp ? 'ASISTENCIA A CASA ABIERTA' : 'VISITA A PROPIEDAD'}</p>
                            <h1>{message.listingTitle ?? 'Visita a la propiedad'}</h1>
                            {message.listingColonia && <p className="appointment-print-location">{message.listingColonia}, Ixmiquilpan, Hidalgo</p>}
                            <div className="appointment-print-datetime">
                              <span>FECHA Y HORA</span>
                              <strong>{message.appointmentStartAt ? new Date(message.appointmentStartAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : 'Por acordar'}</strong>
                              {message.appointmentEndAt && <small>Hasta {new Date(message.appointmentEndAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</small>}
                            </div>
                            <div className="appointment-print-details">
                              <div><span>Asistente</span><strong>{message.senderName}</strong></div>
                              <div><span>Folio</span><strong>{message.id.slice(0, 8).toUpperCase()}</strong></div>
                            </div>
                            <p className="appointment-print-note">Presenta este comprobante al coordinar tu visita. La dirección exacta y el punto de encuentro deben confirmarse directamente con quien publica.</p>
                            <footer className="appointment-print-footer"><strong>IxmiPlace</strong><span>Tu comunidad, tu hogar · ixmiplace.vercel.app</span></footer>
                          </section>
                        </div>
                      )}
                      {message.visitStatus === 'cancelled' && <p className="mt-3 rounded-lg bg-cream-100 p-3 text-sm text-ink-600">La solicitud no fue confirmada.</p>}
                      {folder === 'received' && message.status === 'unread' && <button type="button" onClick={() => void markRead(message)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 print:hidden"><Check className="h-4 w-4" />Marcar como leído</button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
