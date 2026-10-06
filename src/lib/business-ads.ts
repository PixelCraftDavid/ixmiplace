import { getToken as getAppCheckToken } from 'firebase/app-check';
import { appCheck, auth } from './firebase';

export type BusinessAdStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'archived';
export interface BusinessAd {
  id: string;
  businessName: string;
  category: string;
  headline: string;
  description: string;
  offerText: string;
  ctaLabel: string;
  ctaUrl: string;
  desktopImageUrl: string;
  desktopImagePublicId: string;
  mobileImageUrl: string;
  mobileImagePublicId: string;
  startsAt: number;
  endsAt: number;
  status: BusinessAdStatus;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  agreedPriceMxn: number;
  paymentStatus: 'unpaid' | 'paid' | 'complimentary';
  metrics: { impressions: number; clicks: number };
}

export type PublicBusinessAd = Pick<BusinessAd,
  'id' | 'businessName' | 'category' | 'headline' | 'description' | 'offerText' | 'ctaLabel'
  | 'ctaUrl' | 'desktopImageUrl' | 'mobileImageUrl' | 'startsAt' | 'endsAt'>;

const AD_IMAGE_PREFIX = 'https://res.cloudinary.com/ckaf3htn/image/upload/';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function appCheckToken(): Promise<string> {
  if (!appCheck) throw new Error('App Check no está configurado.');
  return (await getAppCheckToken(appCheck)).token;
}

export async function loadPublicBusinessAds(): Promise<PublicBusinessAd[]> {
  const response = await fetch('/api/business-ads', { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron cargar los anuncios locales.');
  const result = await response.json() as { ads?: BusinessAd[] };
  return Array.isArray(result.ads) ? result.ads : [];
}

export async function recordBusinessAdMetric(adId: string, metric: 'impressions' | 'clicks'): Promise<void> {
  try {
    const token = await appCheckToken();
    await fetch('/api/business-ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': token },
      body: JSON.stringify({ action: 'metric', adId, metric }),
      keepalive: true,
    });
  } catch {
    // El registro de estadísticas nunca debe impedir abrir o navegar el anuncio.
  }
}

export async function businessAdAdminRequest<T>(payload: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw new Error('Inicia sesión con una cuenta administradora verificada.');
  const [idToken, checkToken] = await Promise.all([user.getIdToken(), appCheckToken()]);
  const response = await fetch('/api/business-ads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'X-Firebase-AppCheck': checkToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(result?.error ?? 'No se pudo completar la operación.');
  if (!result) throw new Error('Respuesta del servidor inválida.');
  return result;
}

export async function uploadBusinessAdImage(file: File): Promise<{ url: string; publicId: string }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Usa una imagen JPG, PNG o WebP de máximo 5 MB.');
  }
  const checkToken = await appCheckToken();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw new Error('Inicia sesión con una cuenta administradora verificada.');
  const idToken = await user.getIdToken();
  const signatureResponse = await fetch('/api/business-ads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'X-Firebase-AppCheck': checkToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'uploadSignature' }),
    cache: 'no-store',
  });
  const signature = await signatureResponse.json().catch(() => null) as {
    cloudName?: string; apiKey?: string; timestamp?: number; upload_preset?: string;
    folder?: string; public_id?: string; overwrite?: boolean; signature?: string; error?: string;
  } | null;
  if (!signatureResponse.ok || !signature?.cloudName || !signature.apiKey || !signature.signature) {
    throw new Error(signature?.error ?? 'No se pudo autorizar la imagen.');
  }
  const form = new FormData();
  form.append('file', file);
  for (const key of ['timestamp', 'upload_preset', 'folder', 'public_id', 'overwrite', 'api_key', 'signature'] as const) {
    const value = key === 'api_key' ? signature.apiKey : signature[key];
    if (value !== undefined) form.append(key, String(value));
  }
  const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: 'POST', body: form });
  const data = await uploaded.json().catch(() => null) as { secure_url?: string; public_id?: string; error?: { message?: string } } | null;
  if (!uploaded.ok || !data?.secure_url || !data.public_id) throw new Error(data?.error?.message ?? 'Cloudinary no aceptó la imagen.');
  if (!data.secure_url.startsWith(AD_IMAGE_PREFIX) || !data.public_id.startsWith('ixmiplace/business-ads/')) {
    throw new Error('La imagen no quedó en el espacio seguro de publicidad.');
  }
  return { url: data.secure_url, publicId: data.public_id };
}
