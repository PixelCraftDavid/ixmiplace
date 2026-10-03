const SAFE_DOCUMENT_ID = /^[A-Za-z0-9_-]{1,150}$/;

export function isSafeDocumentId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_DOCUMENT_ID.test(value);
}
