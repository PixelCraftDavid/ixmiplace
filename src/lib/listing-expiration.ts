export function listingExpiryMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }

  return null;
}

export function isListingExpired(value: unknown, now = Date.now()): boolean {
  const expiry = listingExpiryMillis(value);
  return expiry !== null && expiry <= now;
}
