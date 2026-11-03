import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { Author, Collection, Content, MagazineIssue, MediaAsset } from '../models/index.js';
import { requireRole as requireRoleOnly } from '../middleware/auth.js';
import { AppError, notFound, validationFailed } from '../lib/errors.js';
import { stripHtml } from '../lib/sanitize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/security.js';
import { MAX_BYTES, processImage, storeImage } from '../services/media.js';
import { writeAudit } from '../services/audit.js';

const patchBody = z.object({
  alt_text: z.string().max(300).optional(),
  credit: z.string().max(200).optional(),
  permission_note: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
});

export function createMediaRouter(env: Env): Router {
  const r = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });
  const anyAdmin = requireRole(env, 'site_admin', 'editor_in_chief', 'editor', 'content_manager');

  r.use(requireAuth, anyAdmin, requireCsrf);

  r.get('/', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const page = Math.max(1, Number(req.query.page) || 1);
      const size = Math.min(100, Math.max(1, Number(req.query.page_size) || 30));
      const [rows, total] = await Promise.all([
        MediaAsset.find({}).sort({ created_at: -1 }).skip((page - 1) * size).limit(size).lean(),
        MediaAsset.countDocuments({}),
      ]);
      res.json({
        items: (rows as unknown as Array<Record<string, unknown> & { _id: unknown }>).map((m) => ({
          id: String(m._id), url: `${env.MEDIA_BASE_URL}/${m.storage_key}`, width: m.width, height: m.height, bytes: m.bytes,
          alt_text: m.alt_text ?? '', credit: m.credit ?? null, is_public: m.is_public, dev_data: Boolean(m.dev_data),
        })),
        page, page_size: size, total,
      });
    } catch (err) {
      next(err);
    }
  });

  // Deleting is for site_admin only, and only for a file nothing uses.
  r.delete('/:id', requireRoleOnly(env, 'site_admin'), async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!/^[a-f0-9]{24}$/i.test(id)) return next(notFound());
      const doc = await MediaAsset.findById(id).lean();
      if (!doc) return next(notFound());
      const uses = await Promise.all([
        Content.countDocuments({ cover_media_id: id }), Author.countDocuments({ photo_media_id: id }),
        Collection.countDocuments({ cover_media_id: id }), MagazineIssue.countDocuments({ cover_media_id: id }),
      ]);
      if (uses.some((n) => n > 0)) {
        return next(validationFailed([{ field: 'id', code: 'in_use', message_hi: 'यह चित्र उपयोग में है, इसे हटाया नहीं जा सकता' }]));
      }
      await MediaAsset.deleteOne({ _id: id });
      await writeAudit({ actor_id: req.admin!.id, action: 'media.delete', entity: 'media_asset', entity_id: id, request_id: (req as { id?: string }).id });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.post(
    '/',
    (req, res, next) =>
      upload.single('file')(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(413, 'payload_too_large', 'File larger than 5 MB', 'फ़ाइल 5 MB से बड़ी है'));
        }
        next(new AppError(400, 'bad_request', 'Upload failed', 'अपलोड विफल रहा'));
      }),
    async (req, res, next) => {
      try {
        if (!req.file) return next(validationFailed([{ field: 'file', code: 'required', message_hi: 'कृपया फ़ाइल चुनें' }]));
        const img = await processImage(req.file.buffer);
        const key = await storeImage(env.MEDIA_DIR, img);
        const doc = await MediaAsset.create({
          storage_key: key,
          original_filename: stripHtml(req.file.originalname).slice(0, 200),
          mime: img.mime,
          width: img.width,
          height: img.height,
          bytes: img.buffer.length,
          alt_text: '',
          uploaded_by: req.admin!.id,
          is_public: false,
        });
        await writeAudit({ actor_id: req.admin!.id, action: 'media.upload', entity: 'media_asset', entity_id: String(doc._id), request_id: (req as { id?: string }).id });
        res.status(201).json({
          id: String(doc._id),
          url: `${env.MEDIA_BASE_URL}/${key}`,
          width: img.width,
          height: img.height,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  r.patch('/:id', async (req, res, next) => {
    try {
      const parsed = patchBody.safeParse(req.body);
      if (!parsed.success) return next(validationFailed([{ field: 'body', code: 'invalid' }]));
      const set: Record<string, unknown> = {};
      if (parsed.data.alt_text !== undefined) set.alt_text = stripHtml(parsed.data.alt_text).trim();
      if (parsed.data.credit !== undefined) set.credit = stripHtml(parsed.data.credit).trim();
      if (parsed.data.permission_note !== undefined) set.permission_note = stripHtml(parsed.data.permission_note).trim();
      if (parsed.data.is_public !== undefined) set.is_public = parsed.data.is_public;
      const doc = await MediaAsset.findByIdAndUpdate(req.params.id, { $set: set }, { returnDocument: 'after' });
      if (!doc) return next(notFound());
      await writeAudit({ actor_id: req.admin!.id, action: 'media.update', entity: 'media_asset', entity_id: String(doc._id), request_id: (req as { id?: string }).id });
      res.json({ id: String(doc._id), alt_text: doc.alt_text, credit: doc.credit, is_public: doc.is_public });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
