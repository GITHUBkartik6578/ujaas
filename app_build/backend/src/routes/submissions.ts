import { Router, type Request } from 'express';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { AppError, unavailable, validationFailed, zodToFields } from '../lib/errors.js';
import { newReferenceId, saltedHash } from '../lib/hash.js';
import { hasForbiddenControlChars, toStoredText } from '../lib/hindi.js';
import { stripHtml } from '../lib/sanitize.js';
import { gte } from '../lib/queries.js';
import { limits } from '../middleware/security.js';
import { ConsentText, ContactMessage, CONTENT_TYPES, IdempotencyKey, Submission, SubmissionEvent } from '../models/index.js';
import { withTx } from '../services/content.js';

/**
 * Public writes: the writer submission form and the contact form (docs/api-contract.md section 2).
 * Privacy rules (submission_privacy skill): the response never echoes private data, a honeypot hit looks like
 * a success and stores nothing, the body and email never reach a log line, and a database failure is a 503
 * with nothing half saved.
 */

const MIN_FILL_MS = 3000; // a form filled faster than this is a script
const DUPLICATE_DAYS = 30;
const PER_EMAIL_PER_DAY = 20;

const plain = (max: number) => z.string().max(max).transform((s) => stripHtml(s).trim().normalize('NFC'));

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw validationFailed(zodToFields(r.error));
  return r.data;
}

export async function activeConsent(env: Env) {
  // Development consent rows are never used in production.
  const filter = env.NODE_ENV === 'production' ? { dev_data: false } : {};
  return ConsentText.findOne(filter).sort({ approved_at: -1 }).lean();
}

const tooFast = (startedAt: number | undefined) => startedAt === undefined || Date.now() - startedAt < MIN_FILL_MS;

export function createSubmissionRouter(env: Env): Router {
  const r = Router();
  const hash = (v: string) => saltedHash(v, env.IP_HASH_SALT);
  const clientHashes = (req: Request) => ({ ip_hash: hash(req.ip ?? 'unknown'), ua_hash: hash(req.header('user-agent') ?? 'unknown') });

  const submissionInput = z.object({
    display_name: plain(80).pipe(z.string().min(1)),
    pen_name: plain(80).optional(),
    email: z.string().trim().toLowerCase().email().max(254),
    title: plain(160).pipe(z.string().min(1)),
    creation_type: z.enum(CONTENT_TYPES),
    body: z.string().min(1).max(env.SUBMISSION_BODY_MAX),
    description: plain(300).optional(),
    consent_original: z.literal(true),
    consent_publication: z.literal(true),
    consent_privacy: z.literal(true),
    consent_text_version: z.string().min(1).max(60),
    form_started_at: z.coerce.number().int().optional(),
    website: z.string().max(200).optional(), // honeypot: real visitors never see or fill it
  });

  // What the form needs to render: the owner's consent statements, or "closed" while none exist (D-03).
  r.get('/submission-config', async (_req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-cache');
      const c = await activeConsent(env);
      if (!c) return res.json({ open: false });
      res.json({
        open: true,
        version: c.version,
        consents: { original: c.text_original, publication: c.text_publication, privacy: c.text_privacy },
        body_max: env.SUBMISSION_BODY_MAX,
      });
    } catch (err) {
      next(err);
    }
  });

  r.post('/submissions', limits.submissions(env.RATE_LIMIT_SCALE), async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const raw = (req.body ?? {}) as Record<string, unknown>;

      // Spam first, before anything is validated or revealed: a bot gets the same answer as a person.
      const honeypot = typeof raw.website === 'string' && raw.website.trim() !== '';
      const started = Number(raw.form_started_at);
      if (honeypot || tooFast(Number.isFinite(started) ? started : undefined)) {
        return res.status(201).json({ reference_id: newReferenceId() }); // stores nothing
      }

      const consent = await activeConsent(env);
      if (!consent) throw new AppError(503, 'submissions_closed', 'Submissions are not open', 'रचनाएँ अभी स्वीकार नहीं की जा रहीं');

      const key = req.header('idempotency-key');
      if (key && key.length <= 80) {
        const seen = await IdempotencyKey.findOne({ key }).lean();
        if (seen) return res.status(201).json((seen as unknown as { response: unknown }).response);
      }

      const input = parse(submissionInput, raw);
      const problems: Array<{ field: string; code: string; message_hi: string }> = [];
      if (input.consent_text_version !== consent.version) {
        problems.push({ field: 'consent_text_version', code: 'stale_consent', message_hi: 'सहमति का पाठ बदल गया है, कृपया पृष्ठ फिर से खोलें' });
      }
      const body = toStoredText(stripHtml(input.body)).trim();
      if (hasForbiddenControlChars(body)) problems.push({ field: 'body', code: 'control_chars', message_hi: 'पाठ में अमान्य अक्षर हैं' });
      if (body.length === 0) problems.push({ field: 'body', code: 'too_small', message_hi: 'यह क्षेत्र आवश्यक है' });
      if (problems.length > 0) throw validationFailed(problems);

      const email = input.email;
      const since = (days: number) => new Date(Date.now() - days * 86_400_000);
      if ((await Submission.countDocuments({ email, created_at: gte(since(1)) })) >= PER_EMAIL_PER_DAY) {
        throw new AppError(429, 'rate_limited', 'Too many submissions from this address', 'इस ईमेल से बहुत अधिक रचनाएँ भेजी गई हैं', undefined, { 'Retry-After': '86400' });
      }
      const dedupe_hash = hash(`${email}\n${body.replace(/\s+/g, ' ')}`);
      if (await Submission.exists({ dedupe_hash, created_at: gte(since(DUPLICATE_DAYS)) })) {
        // Never says which reference the earlier copy has.
        throw new AppError(409, 'duplicate_submission', 'This work was already received', 'यह रचना पहले ही प्राप्त हो चुकी है');
      }

      let reference_id = '';
      try {
        for (let attempt = 0; attempt < 5 && !reference_id; attempt++) {
          const candidate = newReferenceId();
          try {
            await withTx(async (session) => {
              const [sub] = await Submission.create([{
                reference_id: candidate, display_name: input.display_name, pen_name: input.pen_name || undefined, email,
                title: input.title, creation_type: input.creation_type, body, description: input.description || undefined,
                consent_original: true, consent_publication: true, consent_privacy: true,
                consent_text_version: consent.version, consent_at: new Date(), ...clientHashes(req), dedupe_hash,
                status: 'pending_review',
              }] as never, { session });
              await SubmissionEvent.create([{
                submission_id: (sub as unknown as { _id: unknown })._id, to_status: 'pending_review', actor: 'writer', kind: 'submitted',
              }] as never, { session });
            });
            reference_id = candidate;
          } catch (err) {
            if ((err as { code?: number }).code !== 11000) throw err; // only a reference clash is retried
          }
        }
      } catch {
        throw unavailable(); // one transaction: nothing is partly saved
      }
      if (!reference_id) throw unavailable();

      const response = { reference_id };
      if (key && key.length <= 80) await IdempotencyKey.create({ key, response }).catch(() => undefined);
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  });

  const contactInput = z.object({
    name: plain(80).pipe(z.string().min(1)),
    email: z.string().trim().toLowerCase().email().max(254),
    subject: plain(120).pipe(z.string().min(1)),
    message: plain(1000).pipe(z.string().min(1)),
    form_started_at: z.coerce.number().int().optional(),
    website: z.string().max(200).optional(),
  });

  r.post('/contact', limits.contact(env.RATE_LIMIT_SCALE), async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const raw = (req.body ?? {}) as Record<string, unknown>;
      const started = Number(raw.form_started_at);
      if ((typeof raw.website === 'string' && raw.website.trim() !== '') || tooFast(Number.isFinite(started) ? started : undefined)) {
        return res.status(201).json({ ok: true });
      }
      const input = parse(contactInput, raw);
      const message = toStoredText(input.message);
      if (hasForbiddenControlChars(message)) throw validationFailed([{ field: 'message', code: 'control_chars', message_hi: 'पाठ में अमान्य अक्षर हैं' }]);
      try {
        await ContactMessage.create({ name: input.name, email: input.email, subject: input.subject, message, ip_hash: hash(req.ip ?? 'unknown') });
      } catch {
        throw unavailable();
      }
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
