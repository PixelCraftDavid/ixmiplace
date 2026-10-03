import type { AppUser } from '../../types/models';

export const TERMS_VERSION = '2026-10-03-v5';
export const PRIVACY_NOTICE_VERSION = '2026-10-03-v9';
export const LISTING_CONSENT_VERSION = '2026-09-26';

/** true si el usuario aceptó las versiones vigentes de términos, mayoría de edad y privacidad. */
export function hasAcceptedCurrentLegal(
  profile: Pick<
    AppUser,
    'termsAcceptedVersion' | 'adultConfirmedVersion' | 'privacyConsentVersion'
  >
): boolean {
  return (
    profile.termsAcceptedVersion === TERMS_VERSION &&
    profile.adultConfirmedVersion === TERMS_VERSION &&
    profile.privacyConsentVersion === PRIVACY_NOTICE_VERSION
  );
}
