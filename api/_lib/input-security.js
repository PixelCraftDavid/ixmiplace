import { createHash } from 'node:crypto';
import { z } from 'zod';

const DOC_ID_PATTERN = /^[A-Za-z0-9_-]{1,150}$/;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HTML_TAG = /<\s*\/?\s*[a-z][^>]*>/i;

export const documentIdSchema = z.string().regex(DOC_ID_PATTERN);

const plainText = (min, max) => z.string()
  .trim()
  .transform((value) => value.normalize('NFC'))
  .pipe(z.string().min(min).max(max)
    .refine((value) => !CONTROL_CHARACTERS.test(value))
    .refine((value) => !HTML_TAG.test(value)));

export const requestSchemas = {
  contact: z.object({ listingId: documentIdSchema }).strict(),
  message: z.object({
    listingId: documentIdSchema,
    recipientId: documentIdSchema,
    ciphertext: z.string().min(40).max(12000).regex(/^[A-Za-z0-9+/]+=*$/),
    iv: z.string().length(16).regex(/^[A-Za-z0-9+/]+=*$/),
    senderEnvelope: z.object({
      recipientId: documentIdSchema,
      salt: z.string().length(44).regex(/^[A-Za-z0-9+/]+=*$/),
      iv: z.string().length(16).regex(/^[A-Za-z0-9+/]+=*$/),
      encryptedKey: z.string().min(40).max(128).regex(/^[A-Za-z0-9+/]+=*$/),
    }).strict(),
    recipientEnvelope: z.object({
      recipientId: documentIdSchema,
      salt: z.string().length(44).regex(/^[A-Za-z0-9+/]+=*$/),
      iv: z.string().length(16).regex(/^[A-Za-z0-9+/]+=*$/),
      encryptedKey: z.string().min(40).max(128).regex(/^[A-Za-z0-9+/]+=*$/),
    }).strict(),
  }).strict(),
  report: z.object({
    listingId: documentIdSchema,
    reason: z.enum(['spam', 'fraude', 'no_existe', 'duplicado', 'otro']),
    comment: plainText(0, 500).optional().default(''),
  }).strict(),
  metric: z.object({ listingId: documentIdSchema, metric: z.literal('viewsCount') }).strict(),
  push: z.object({
    type: z.enum(['listing_created', 'message_created', 'notification_created', 'report_created']),
    id: documentIdSchema,
  }).strict(),
  deleteAccount: z.object({ confirm: z.literal('ELIMINAR') }).strict(),
};

export function parseBody(schema, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}

// Vercel's runtime logs provide a low-cost audit trail. Never log tokens,
// request bodies, message contents, email addresses, or raw IP addresses.
export function logSecurityEvent(req, reason, uid = null) {
  const ip = typeof req.headers['x-real-ip'] === 'string'
    ? req.headers['x-real-ip'].trim()
    : '';
  const ipHash = ip
    ? createHash('sha256').update(ip).digest('hex').slice(0, 20)
    : undefined;
  console.warn(JSON.stringify({
    event: 'security_reject',
    route: String(req.url || '').split('?')[0].slice(0, 100),
    reason: String(reason).slice(0, 60),
    ...(uid ? { uid: String(uid).slice(0, 128) } : {}),
    ...(ipHash ? { ipHash } : {}),
    at: new Date().toISOString(),
  }));
}

export function logApiFailure(req, endpoint, stage, error) {
  const ip = typeof req.headers['x-real-ip'] === 'string'
    ? req.headers['x-real-ip'].trim()
    : '';
  console.error(JSON.stringify({
    event: 'api_failure',
    endpoint,
    stage,
    route: String(req.url || '').split('?')[0].slice(0, 100),
    ...(ip ? { ipHash: createHash('sha256').update(ip).digest('hex').slice(0, 20) } : {}),
    code: typeof error?.code === 'string' || typeof error?.code === 'number'
      ? String(error.code).slice(0, 40)
      : 'unknown',
    at: new Date().toISOString(),
  }));
}
