import { useEffect, useState } from 'react';
import { Mail, Loader2, Check } from 'lucide-react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import type { InternalMessage } from '../../types/models';

export function MessagesPage() {
  const { fbUser } = useAuth();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fbUser) return;
    const messagesQuery = query(
      collection(db, 'messages'),
      where('recipientId', '==', fbUser.uid)
    );
    return onSnapshot(messagesQuery, (snapshot) => {
      const data = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...(messageDoc.data() as Omit<InternalMessage, 'id'>),
      }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(data);
      setLoading(false);
    }, (error) => {
      console.error('Error cargando mensajes:', error);
      setLoading(false);
    });
  }, [fbUser]);

  async function markRead(message: InternalMessage) {
    if (message.status === 'read') return;
    await updateDoc(doc(db, 'messages', message.id), { status: 'read' });
  }

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-3xl py-8">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Mail className="h-3.5 w-3.5" /> Contacto privado
          </div>
          <h1 className="text-3xl font-extrabold text-ink">Mensajes recibidos</h1>
          <p className="mt-2 text-ink-500">Responde a las personas interesadas en tus propiedades.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-24 text-ink-400"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-sm">
            <Mail className="mx-auto h-10 w-10 text-brand-400" />
            <h2 className="mt-4 text-xl font-bold text-ink">Aún no tienes mensajes</h2>
            <p className="mt-2 text-sm text-ink-500">Los interesados podrán escribirte desde el detalle de tus propiedades.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <article key={message.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${message.status === 'unread' ? 'border-brand-200 ring-2 ring-brand-500/10' : 'border-cream-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Mail className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-bold text-ink">{message.subject}</h2>
                      <time className="text-xs text-ink-400">{new Date(message.createdAt).toLocaleString('es-MX')}</time>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-brand-700">{message.senderName}</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">{message.message}</p>
                    {message.status === 'unread' && <button type="button" onClick={() => void markRead(message)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"><Check className="h-4 w-4" /> Marcar como leído</button>}
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
