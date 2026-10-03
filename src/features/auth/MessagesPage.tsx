import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { ArrowUpRight, KeyRound, Loader2, LockKeyhole, Mail, Send, ShieldCheck } from 'lucide-react';
import { db } from '../../lib/firebase';
import { postProtectedApi } from '../../lib/protected-api';
import { requestPushDelivery } from '../../lib/push-notifications';
import { createLocalChatIdentity, decryptChatMessage, encryptChatMessage, getLocalChatIdentity, type ChatEnvelope } from '../../lib/e2ee-chat';
import { useAuth } from './AuthContext';

type Conversation = { id: string; listingId: string; participantIds: string[]; lastMessageAt: number };
type StoredChatMessage = {
  id: string; conversationId: string; listingId: string; senderId: string; recipientId: string;
  ciphertext: string; iv: string; senderEnvelope: ChatEnvelope; recipientEnvelope: ChatEnvelope;
  status: string; createdAt: number;
};
type DisplayMessage = StoredChatMessage & { subject?: string; message?: string; decryptError?: string };
type LegacyMessage = { id: string; subject: string; message: string; senderName: string; createdAt: number; status: string };

export function MessagesPage() {
  const { fbUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [legacyMessages, setLegacyMessages] = useState<LegacyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [listingNames, setListingNames] = useState<Record<string, string>>({});
  const selectedId = params.get('c') || '';
  const selected = useMemo(() => conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0] ?? null, [conversations, selectedId]);

  useEffect(() => {
    if (!fbUser) return;
    let active = true;
    void getLocalChatIdentity().then((identity) => { if (active) setHasKey(Boolean(identity)); }).catch(() => { if (active) setHasKey(false); });
    return () => { active = false; };
  }, [fbUser]);

  useEffect(() => {
    if (!fbUser) return;
    const inbox = query(collection(db, 'conversations'), where('participantIds', 'array-contains', fbUser.uid));
    return onSnapshot(inbox, (snapshot) => {
      const items = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Conversation, 'id'>) }));
      items.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      setConversations(items);
      setLoading(false);
      const ids = [...new Set(items.flatMap((item) => item.participantIds.filter((uid) => uid !== fbUser.uid)))];
      void Promise.all(ids.map(async (uid) => {
        try {
          const snapshot = await getDoc(doc(db, 'publicProfiles', uid));
          if (snapshot.exists()) setNames((previous) => ({ ...previous, [uid]: snapshot.data().displayName || 'Usuario' }));
        } catch { /* perfil público opcional */ }
      }));
      void Promise.all([...new Set(items.map((item) => item.listingId))].map(async (listingId) => {
        try {
          const snapshot = await getDoc(doc(db, 'listings', listingId));
          if (snapshot.exists()) setListingNames((previous) => ({ ...previous, [listingId]: snapshot.data().title || 'Publicación' }));
        } catch { /* anuncio retirado */ }
      }));
      if (items.length && !items.some((item) => item.id === selectedId)) setParams({ c: items[0].id }, { replace: true });
    }, (error) => { console.error('Error cargando conversaciones:', error); setLoading(false); });
  }, [fbUser, selectedId, setParams]);

  useEffect(() => {
    if (!fbUser || !selected) { setMessages([]); return; }
    setLoading(true);
    const messageQuery = query(collection(db, 'chatMessages'), where('conversationId', '==', selected.id));
    return onSnapshot(messageQuery, async (snapshot) => {
      const stored = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<StoredChatMessage, 'id'>) }));
      stored.sort((a, b) => a.createdAt - b.createdAt);
      const decrypted = await Promise.all(stored.map(async (item): Promise<DisplayMessage> => {
        try {
          const clear = await decryptChatMessage({ ...item, uid: fbUser.uid });
          return { ...item, ...clear };
        } catch (error) {
          return { ...item, decryptError: error instanceof Error ? error.message : 'No se pudo descifrar este mensaje.' };
        }
      }));
      setMessages(decrypted);
      setLoading(false);
      for (const item of stored) {
        if (item.recipientId === fbUser.uid && item.status !== 'read') {
          void updateDoc(doc(db, 'chatMessages', item.id), { status: 'read' }).catch(() => undefined);
        }
      }
    }, (error) => { console.error('Error cargando conversación:', error); setLoading(false); });
  }, [fbUser, selected]);

  useEffect(() => {
    if (!fbUser) return;
    const oldInbox = query(collection(db, 'messages'), where('recipientId', '==', fbUser.uid));
    return onSnapshot(oldInbox, (snapshot) => {
      const items = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<LegacyMessage, 'id'>) }));
      items.sort((a, b) => b.createdAt - a.createdAt);
      setLegacyMessages(items);
    }, (error) => console.error('Error cargando mensajes anteriores:', error));
  }, [fbUser]);

  async function prepareEncryption() {
    if (!fbUser) return;
    setPreparing(true); setKeyError('');
    try { await createLocalChatIdentity(fbUser.uid); setHasKey(true); }
    catch (error) { setKeyError(error instanceof Error ? error.message : 'No se pudo preparar el cifrado.'); }
    finally { setPreparing(false); }
  }

  async function sendMessage() {
    if (!fbUser || !selected || !draft.trim()) return;
    const recipientId = selected.participantIds.find((uid) => uid !== fbUser.uid);
    if (!recipientId) return;
    setSending(true); setSendError('');
    try {
      const encrypted = await encryptChatMessage({ uid: fbUser.uid, recipientId, listingId: selected.listingId, subject: 'Mensaje privado', message: draft.trim() });
      const result = await postProtectedApi<{ messageId: string }>('/api/message', { listingId: selected.listingId, recipientId, ...encrypted });
      await requestPushDelivery('message_created', result.messageId);
      setDraft('');
    } catch (error) { setSendError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje cifrado.'); }
    finally { setSending(false); }
  }

  return (
    <main className="min-h-screen bg-cream px-4 pb-12 pt-24 sm:px-6">
      <div className="mx-auto max-w-6xl py-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"><LockKeyhole className="h-3.5 w-3.5" /> Mensajes cifrados</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Conversaciones</h1>
            <p className="mt-1 text-sm text-ink-500">Solo tus dispositivos con la clave privada pueden leerlos.</p>
          </div>
          {hasKey === false && <button type="button" onClick={() => void prepareEncryption()} disabled={preparing} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">{preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Preparar este dispositivo</button>}
        </header>

        {hasKey === false && <section className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Configuración de cifrado necesaria.</strong> Se genera una clave privada en este dispositivo y nunca se sube a IxmiPlace. Si borras los datos del navegador o cambias de dispositivo, no podrás recuperar el historial cifrado. {keyError && <p className="mt-2 text-red-700">{keyError}</p>}</section>}
        {hasKey && <p className="mb-5 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Cifrado de extremo a extremo activo. IxmiPlace almacena solo datos cifrados y metadatos mínimos de la conversación.</p>}

        <section className="grid min-h-[560px] overflow-hidden rounded-3xl border border-cream-200 bg-white shadow-sm md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-cream-200 bg-cream-50 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 border-b border-cream-200 px-5 py-4 text-sm font-bold text-ink"><Mail className="h-4 w-4 text-brand-600" /> Tus chats</div>
            {loading && conversations.length === 0 ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-ink-400" /></div> : conversations.length === 0 ? <div className="px-5 py-10 text-center text-sm text-ink-500">Aún no tienes conversaciones.</div> : conversations.map((conversation) => {
              const otherId = conversation.participantIds.find((uid) => uid !== fbUser?.uid) || '';
              const active = selected?.id === conversation.id;
              return <button key={conversation.id} type="button" onClick={() => setParams({ c: conversation.id })} className={`flex w-full items-center justify-between gap-3 border-b border-cream-200 px-5 py-4 text-left transition hover:bg-white ${active ? 'bg-white' : ''}`}>
                <span className="min-w-0"><span className="block truncate font-semibold text-ink">{names[otherId] || 'Usuario'}</span><span className="mt-1 block truncate text-xs text-ink-500">{listingNames[conversation.listingId] || 'Publicación'} · Mensaje cifrado</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400" />
              </button>;
            })}
          </aside>

          <div className="flex min-h-[540px] min-w-0 flex-col">
            {selected ? <>
              <div className="border-b border-cream-200 px-5 py-4"><h2 className="font-bold text-ink">{names[selected.participantIds.find((uid) => uid !== fbUser?.uid) || ''] || 'Usuario'}</h2><p className="mt-1 text-xs text-ink-500">{listingNames[selected.listingId] || 'Publicación'} · Cifrado de extremo a extremo</p></div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-[#faf9f6] p-4 sm:p-6">
                {messages.map((message) => <article key={message.id} className={`max-w-[88%] rounded-2xl border px-4 py-3 ${message.senderId === fbUser?.uid ? 'ml-auto border-brand-200 bg-brand-50' : 'border-cream-200 bg-white'}`}>
                  {message.decryptError ? <p className="text-sm text-amber-800">No se pudo leer este mensaje en este dispositivo: {message.decryptError}</p> : <><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700">{message.message}</p><time className="mt-2 block text-right text-[11px] text-ink-400">{new Date(message.createdAt).toLocaleString('es-MX')}</time></>}
                </article>)}
                {!loading && messages.length === 0 && <p className="py-16 text-center text-sm text-ink-500">Inicia la conversación con un mensaje cifrado.</p>}
              </div>
              <div className="border-t border-cream-200 p-4 sm:p-5">
                {!hasKey ? <p className="text-sm text-amber-800">Prepara el cifrado en este dispositivo para leer y enviar mensajes.</p> : <>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 5000))} rows={3} placeholder="Escribe un mensaje…" className="w-full resize-y rounded-xl border border-cream-300 bg-white p-3 text-sm text-ink outline-none focus:border-brand-500" />
                  <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-red-600">{sendError}</span><button type="button" disabled={sending || draft.trim().length === 0} onClick={() => void sendMessage()} className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar cifrado</button></div>
                </>}
              </div>
            </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><LockKeyhole className="h-10 w-10 text-brand-400" /><h2 className="mt-4 text-lg font-bold text-ink">Tus conversaciones, solo para ti</h2><p className="mt-2 max-w-sm text-sm text-ink-500">Al escribir a una propiedad, el chat aparecerá aquí. Los mensajes se cifran antes de salir de tu navegador.</p></div>}
          </div>
        </section>
        {legacyMessages.length > 0 && <section className="mt-7 rounded-2xl border border-amber-300 bg-amber-50/70 p-5"><h2 className="font-bold text-amber-950">Mensajes anteriores · sin cifrado de extremo a extremo</h2><p className="mt-1 text-xs leading-relaxed text-amber-900">Estos mensajes se enviaron antes del nuevo chat cifrado y permanecen en el formato anterior. IxmiPlace no los convierte automáticamente.</p><div className="mt-4 space-y-3">{legacyMessages.map((message) => <article key={message.id} className="rounded-xl border border-amber-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm text-ink-800">{message.subject}</strong><time className="text-xs text-ink-500">{new Date(message.createdAt).toLocaleString('es-MX')}</time></div><p className="mt-1 text-xs font-semibold text-brand-700">{message.senderName}</p><p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{message.message}</p>{message.status === 'unread' && <button type="button" onClick={() => void updateDoc(doc(db, 'messages', message.id), { status: 'read' })} className="mt-3 text-xs font-semibold text-brand-700 underline">Marcar como leído</button>}</article>)}</div></section>}
      </div>
    </main>
  );
}
