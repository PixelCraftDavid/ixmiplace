import type { User } from 'firebase/auth';

/** Return only the HTTPS Google avatar URL; the image itself stays hosted by Google. */
export function googleProfilePhotoUrl(user: Pick<User, 'providerData' | 'photoURL'>): string | null {
  const googleProvider = user.providerData.find((provider) => provider.providerId === 'google.com');
  const candidate = googleProvider?.photoURL ?? (googleProvider ? user.photoURL : null);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.hostname === 'lh3.googleusercontent.com'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
