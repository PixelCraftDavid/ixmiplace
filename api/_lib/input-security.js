import { createHash } from 'node:crypto';
import { z } from 'zod';

const DOC_ID_PATTERN = /^[A-Za-z0-9_-]{1,150}$/;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HTML_TAG = /<\s*\/?\s*[a-z][^>]*>/i;
const BUSINESS_AD_IMAGE_URL = /^https:\/\/res\.cloudinary\.com\/ckaf3htn\/image\/upload\/.{1,1800}$/;
const BUSINESS_AD_IMAGE_ID = /^ixmiplace\/business-ads\/[A-Za-z0-9_-]{1,100}$/;
const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const documentIdSchema = z.string().regex(DOC_ID_PATTERN)
  .refine((value) => !DANGEROUS_OBJECT_KEYS.has(value));

export function hasUnsafeObjectKeys(value) {
  const pending = [value];
  const visited = new WeakSet();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== 'object') continue;
    if (visited.has(current)) return true;
    visited.add(current);

    if (!Array.isArray(current)) {
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) return true;
    }

    for (const key of Object.keys(current)) {
      if (DANGEROUS_OBJECT_KEYS.has(key)) return true;
      pending.push(current[key]);
    }
  }

  return false;
}

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
    subject: plainText(3, 100),
    message: plainText(10, 1000),
    website: z.string().trim().max(200).optional().default(''),
    visitRequestedAt: z.number().int().positive().optional(),
    openHouseRsvp: z.boolean().optional(),
  }).strict(),
  report: z.object({
    listingId: documentIdSchema,
    reason: z.enum(['spam', 'fraude', 'no_existe', 'duplicado', 'otro']),
    comment: plainText(0, 500).optional().default(''),
    website: z.string().trim().max(200).optional().default(''),
  }).strict(),
  metric: z.object({ listingId: documentIdSchema, metric: z.literal('viewsCount') }).strict(),
  businessAdMetric: z.object({
    action: z.literal('metric'),
    adId: documentIdSchema,
    metric: z.enum(['impressions', 'clicks']),
  }).strict(),
  businessProfileMetric: z.object({
    action: z.literal('metric'),
    profileId: documentIdSchema,
    metric: z.enum(['profileViews', 'contactClicks']),
  }).strict(),
  businessAdAdmin: z.discriminatedUnion('action', [
    z.object({ action: z.literal('list') }).strict(),
    z.object({ action: z.literal('directoryList') }).strict(),
    z.object({ action: z.literal('uploadSignature') }).strict(),
    z.object({
      action: z.literal('save'),
      adId: documentIdSchema.optional(),
      businessName: plainText(2, 80),
      category: plainText(2, 40),
      headline: plainText(4, 80),
      description: plainText(10, 320),
      offerText: plainText(0, 160).optional().default(''),
      ctaLabel: plainText(2, 32),
      ctaUrl: z.string().url().max(500).refine((value) => value.startsWith('https://')),
      desktopImageUrl: z.string().regex(BUSINESS_AD_IMAGE_URL),
      desktopImagePublicId: z.string().regex(BUSINESS_AD_IMAGE_ID),
      mobileImageUrl: z.string().regex(BUSINESS_AD_IMAGE_URL),
      mobileImagePublicId: z.string().regex(BUSINESS_AD_IMAGE_ID),
      startsAt: z.number().int().positive(),
      endsAt: z.number().int().positive(),
      status: z.enum(['draft', 'scheduled', 'active', 'paused']),
      contactName: plainText(2, 80),
      contactPhone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/),
      contactEmail: z.string().trim().email().max(160).or(z.literal('')),
      agreedPriceMxn: z.number().min(0).max(1000000),
      paymentStatus: z.enum(['unpaid', 'paid', 'complimentary']),
      consentConfirmed: z.literal(true),
    }).strict(),
    z.object({
      action: z.literal('archive'),
      adId: documentIdSchema,
    }).strict(),
    z.object({
      action: z.literal('directorySave'),
      profileId: documentIdSchema.optional(),
      businessName: plainText(2, 80),
      category: plainText(2, 40),
      description: plainText(10, 320),
      location: plainText(2, 120),
      mapUrl: z.string().url().max(500).refine((value) => value.startsWith('https://')).or(z.literal('')),
      contactUrl: z.string().url().max(500).refine((value) => value.startsWith('https://')),
      contactLabel: plainText(2, 32),
      package: z.enum(['listing', 'rotating', 'featured']),
      months: z.union([z.literal(1), z.literal(3), z.literal(6)]),
      startsAt: z.number().int().positive(),
      featuredStartAt: z.number().int().positive().optional(),
      status: z.enum(['draft', 'scheduled', 'active', 'paused']),
      paymentStatus: z.enum(['unpaid', 'paid', 'complimentary']),
      contactName: plainText(2, 80),
      contactPhone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/),
      contactEmail: z.string().trim().email().max(160).or(z.literal('')),
      desktopImageUrl: z.string().regex(BUSINESS_AD_IMAGE_URL).or(z.literal('')),
      desktopImagePublicId: z.string().regex(BUSINESS_AD_IMAGE_ID).or(z.literal('')),
      mobileImageUrl: z.string().regex(BUSINESS_AD_IMAGE_URL).or(z.literal('')),
      mobileImagePublicId: z.string().regex(BUSINESS_AD_IMAGE_ID).or(z.literal('')),
      headline: plainText(4, 80).or(z.literal('')).optional().default(''),
      adDescription: plainText(10, 320).or(z.literal('')).optional().default(''),
      offerText: plainText(0, 160).optional().default(''),
      consentConfirmed: z.literal(true),
    }).strict(),
    z.object({ action: z.literal('directoryArchive'), profileId: documentIdSchema }).strict(),
  ]),
  push: z.object({
    type: z.enum(['listing_created', 'message_created', 'notification_created', 'favorite_created', 'report_created']),
    id: documentIdSchema,
  }).strict(),
  deleteAccount: z.object({ confirm: z.literal('ELIMINAR') }).strict(),
};

export function parseBody(schema, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (hasUnsafeObjectKeys(body)) return null;
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
