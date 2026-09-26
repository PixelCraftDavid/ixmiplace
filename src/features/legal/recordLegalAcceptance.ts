import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from './legalVersions';

export async function recordLegalAcceptance(user: User, acceptedAt = Date.now()) {
  const userRef = doc(db, 'users', user.uid);
  const acceptance = {
    emailVerified: user.emailVerified,
    termsAcceptedVersion: TERMS_VERSION,
    termsAcceptedAt: acceptedAt,
    privacyConsentVersion: PRIVACY_NOTICE_VERSION,
    privacyConsentAt: acceptedAt,
  };
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    await updateDoc(userRef, acceptance);
    return;
  }

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
    role: 'user',
    createdAt: acceptedAt,
    isBanned: false,
    ...(user.phoneNumber ? { phone: user.phoneNumber } : {}),
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    ...acceptance,
  });
}
