import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const DB_NAME = 'ixmiplace-private-chat-v1';
const STORE = 'keys';
const KEY_ID = 'identity';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const result = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(result).set(bytes);
  return result;
}

export type ChatEnvelope = {
  recipientId: string;
  salt: string;
  iv: string;
  encryptedKey: string;
};

export type EncryptedChatPayload = {
  ciphertext: string;
  iv: string;
  senderEnvelope: ChatEnvelope;
  recipientEnvelope: ChatEnvelope;
};
type LocalIdentity = { pair: CryptoKeyPair; publicJwk: JsonWebKey };

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function localKey<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openKeyDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export async function getLocalChatIdentity(): Promise<CryptoKeyPair | null> {
  const saved = await localKey<LocalIdentity | CryptoKeyPair | undefined>('readonly', (store) => store.get(KEY_ID));
  if (!saved) return null;
  return 'pair' in saved ? saved.pair : saved;
}

export async function createLocalChatIdentity(uid: string): Promise<void> {
  if (!crypto.subtle || !indexedDB) throw new Error('Este navegador no permite guardar claves seguras.');
  const saved = await localKey<LocalIdentity | CryptoKeyPair | undefined>('readonly', (store) => store.get(KEY_ID));
  const remoteRef = doc(db, 'chatPublicKeys', uid);
  const alreadyRegistered = await getDoc(remoteRef);
  if (saved && 'pair' in saved) {
    if (!alreadyRegistered.exists()) {
      await setDoc(remoteRef, { uid, publicKey: saved.publicJwk, algorithm: 'ECDH-P256-HKDF-SHA256-AES256GCM', version: 1, createdAt: serverTimestamp() });
    } else if (alreadyRegistered.data().publicKey?.x !== saved.publicJwk.x || alreadyRegistered.data().publicKey?.y !== saved.publicJwk.y) {
      throw new Error('La clave de este navegador no coincide con la registrada para la cuenta.');
    }
    return;
  }
  if (alreadyRegistered.exists()) throw new Error('Esta cuenta ya tiene una clave de chat asociada a otro navegador. Por ahora, el cifrado solo funciona en el dispositivo donde se registró la clave.');
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  await localKey('readwrite', (store) => store.put({ pair, publicJwk } satisfies LocalIdentity, KEY_ID));
  await setDoc(remoteRef, {
    uid,
    publicKey: publicJwk,
    algorithm: 'ECDH-P256-HKDF-SHA256-AES256GCM',
    version: 1,
    createdAt: serverTimestamp(),
  });
}

export async function hasPublicChatKey(uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'chatPublicKeys', uid));
  return snapshot.exists() && snapshot.data().algorithm === 'ECDH-P256-HKDF-SHA256-AES256GCM';
}

async function publicKey(uid: string): Promise<CryptoKey> {
  const snapshot = await getDoc(doc(db, 'chatPublicKeys', uid));
  const jwk = snapshot.data()?.publicKey as JsonWebKey | undefined;
  if (!snapshot.exists() || !jwk) throw new Error('La otra persona todavía no preparó sus mensajes cifrados.');
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

async function deriveWrappingKey(privateKey: CryptoKey, peer: CryptoKey, salt: Uint8Array, info: string): Promise<CryptoKey> {
  const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: peer }, privateKey, 256);
  const material = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: arrayBuffer(salt), info: arrayBuffer(encoder.encode(info)) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function makeEnvelope(rawContentKey: Uint8Array, uid: string, privateKey: CryptoKey, peer: CryptoKey, info: string): Promise<ChatEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapKey = await deriveWrappingKey(privateKey, peer, salt, `${info}:${uid}`);
  const encryptedKey = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: arrayBuffer(iv) }, wrapKey, arrayBuffer(rawContentKey));
  return { recipientId: uid, salt: base64(salt), iv: base64(iv), encryptedKey: base64(new Uint8Array(encryptedKey)) };
}

export async function encryptChatMessage(input: {
  uid: string; recipientId: string; listingId: string; subject: string; message: string;
}): Promise<EncryptedChatPayload> {
  const pair = await getLocalChatIdentity();
  if (!pair) throw new Error('Prepara primero el cifrado en la sección Mensajes de este dispositivo.');
  const recipientPublic = await publicKey(input.recipientId);
  const contentKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const contentKey = await crypto.subtle.importKey('raw', arrayBuffer(contentKeyBytes), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const conversationId = await getConversationId(input.listingId, input.uid, input.recipientId);
  const plaintext = encoder.encode(JSON.stringify({ subject: input.subject, message: input.message }));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: arrayBuffer(iv), additionalData: arrayBuffer(encoder.encode(conversationId)) }, contentKey, arrayBuffer(plaintext));
  const info = `ixmiplace-chat-v1:${conversationId}:${input.uid}:${input.recipientId}`;
  const [senderEnvelope, recipientEnvelope] = await Promise.all([
    makeEnvelope(contentKeyBytes, input.uid, pair.privateKey, recipientPublic, info),
    makeEnvelope(contentKeyBytes, input.recipientId, pair.privateKey, recipientPublic, info),
  ]);
  return { ciphertext: base64(new Uint8Array(ciphertext)), iv: base64(iv), senderEnvelope, recipientEnvelope };
}

export async function decryptChatMessage(data: {
  uid: string; senderId: string; recipientId: string; conversationId: string;
  ciphertext: string; iv: string; senderEnvelope: ChatEnvelope; recipientEnvelope: ChatEnvelope;
}): Promise<{ subject: string; message: string }> {
  const pair = await getLocalChatIdentity();
  if (!pair) throw new Error('La clave privada de este dispositivo no está disponible.');
  const ownEnvelope = data.uid === data.senderId ? data.senderEnvelope : data.recipientEnvelope;
  const peerId = data.uid === data.senderId ? data.recipientId : data.senderId;
  if (ownEnvelope.recipientId !== data.uid) throw new Error('Sobre de clave no válido.');
  const peer = await publicKey(peerId);
  const info = `ixmiplace-chat-v1:${data.conversationId}:${data.senderId}:${data.recipientId}`;
  const wrapKey = await deriveWrappingKey(pair.privateKey, peer, fromBase64(ownEnvelope.salt), `${info}:${data.uid}`);
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: arrayBuffer(fromBase64(ownEnvelope.iv)) }, wrapKey, arrayBuffer(fromBase64(ownEnvelope.encryptedKey)));
  const contentKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: arrayBuffer(fromBase64(data.iv)), additionalData: arrayBuffer(encoder.encode(data.conversationId)) }, contentKey, arrayBuffer(fromBase64(data.ciphertext)));
  const parsed = JSON.parse(decoder.decode(plaintext)) as { subject?: unknown; message?: unknown };
  if (typeof parsed.subject !== 'string' || typeof parsed.message !== 'string') throw new Error('El mensaje cifrado no tiene un formato válido.');
  return { subject: parsed.subject, message: parsed.message };
}

export async function getConversationId(listingId: string, uidA: string, uidB: string): Promise<string> {
  const participants = [uidA, uidB].sort().join(':');
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer(encoder.encode(`${listingId}:${participants}`)));
  return `c_${base64(new Uint8Array(digest)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`;
}
