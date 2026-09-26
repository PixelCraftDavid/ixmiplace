import type { User } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from './legalVersions';

export async function recordLegalAcceptance(user: User) {
  await user.reload();
  await user.getIdToken(true);
  const userRef = doc(db, 'users', user.uid);
  const acceptance = {
    emailVerified: user.emailVerified,
    termsAcceptedVersion: TERMS_VERSION,
    termsAcceptedAt: serverTimestamp(),
    adultConfirmedVersion: TERMS_VERSION,
    adultConfirmedAt: serverTimestamp(),
    privacyConsentVersion: PRIVACY_NOTICE_VERSION,
    privacyConsentAt: serverTimestamp(),
  };
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(userRef);
    if (existing.exists()) {
      transaction.update(userRef, acceptance);
      return;
    }

    transaction.set(userRef, {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
      role: 'user',
      createdAt: Date.now(),
      isBanned: false,
      ...(user.phoneNumber ? { phone: user.phoneNumber } : {}),
      ...(user.photoURL ? { photoURL: user.photoURL } : {}),
      ...acceptance,
    });
  });
}
