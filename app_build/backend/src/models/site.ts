import { Schema, model } from 'mongoose';

const ts = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } } as const;

const mediaSchema = new Schema(
  {
    storage_key: { type: String, required: true, unique: true }, // random, never the client's filename
    original_filename: { type: String, select: false }, // private, not trusted
    mime: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
    alt_text: { type: String, default: '' }, // required before public use
    credit: String,
    permission_note: { type: String, select: false }, // private
    uploaded_by: { type: Schema.Types.ObjectId, ref: 'AdminUser', select: false },
    is_public: { type: Boolean, default: false },
    dev_data: { type: Boolean, default: false },
  },
  ts,
);
export const MediaAsset = model('MediaAsset', mediaSchema, 'media_assets');

const settingSchema = new Schema({ key: { type: String, required: true, unique: true }, value: String }, ts);
export const SiteSetting = model('SiteSetting', settingSchema, 'site_settings');

const homepageSlotSchema = new Schema({
  slot: { type: String, required: true },
  content_id: { type: Schema.Types.ObjectId, ref: 'Content' },
  issue_id: { type: Schema.Types.ObjectId, ref: 'MagazineIssue' },
  position: { type: Number, default: 0 },
});
homepageSlotSchema.index({ slot: 1, position: 1 });
export const HomepageSlot = model('HomepageSlot', homepageSlotSchema, 'homepage_slots');

const idempotencySchema = new Schema({
  key: { type: String, required: true, unique: true },
  response: Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});
export const IdempotencyKey = model('IdempotencyKey', idempotencySchema, 'idempotency_keys');

const migrationSchema = new Schema({ name: { type: String, required: true, unique: true }, applied_at: { type: Date, default: Date.now } });
export const Migration = model('Migration', migrationSchema, 'migrations');
