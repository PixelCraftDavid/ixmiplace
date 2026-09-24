const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '20minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'temp-mail.io',
  'temp-mail.ru',
  'temp-mail.com',
  'tempmail.com',
  'tempmailo.com',
  'tempmail.plus',
  'tempmail.ninja',
  'throwawaymail.com',
  'yopmail.com',
  'getnada.com',
  'maildrop.cc',
  'dispostable.com',
  'fakeinbox.com',
  'emailondeck.com',
  'mohmal.com',
  'burnermail.io',
  'inboxkitten.com',
  'trashmail.com',
  'sharklasers.com',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailsac.com',
  'mailnesia.com',
  'mytemp.email',
  'emailfake.com',
  'crazymailing.com',
  'dominio-temporal.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@').pop() ?? '';
  return Array.from(DISPOSABLE_EMAIL_DOMAINS).some(
    (blockedDomain) =>
      domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
  );
}