import { Schema, model, type Types } from 'mongoose';

const ts = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } } as const;
const oid = (ref: string, required = false) => ({ type: Schema.Types.ObjectId, ref, required });

export const CONTENT_STATUSES = [
  'draft', 'in_review', 'approved', 'scheduled', 'published', 'unpublished', 'archived',
] as const;

// ASSUMPTION: types proposed from the mockups; owner must confirm the approved list (content-handover item 8).
export const CONTENT_TYPES = [
  'kavita', 'ghazal', 'geet', 'kahani', 'laghukatha', 'nibandh', 'sansmaran', 'vichar', 'vimarsh', 'samiksha', 'other',
] as const;

const contentSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    content_type: { type: String, required: true, enum: CONTENT_TYPES },
    body: { type: String, required: true },
    body_format: { type: String, required: true, enum: ['verse', 'prose'] },
    excerpt: { type: String, required: true, maxlength: 300 },
    category_id: oid('Category', true),
    topic_ids: [oid('Topic')],
    credits: [
      new Schema({ author_id: oid('Author', true), role: { type: String, enum: ['author', 'translator'], default: 'author' } }, { _id: false }),
    ],
    source_note: String,
    translator_note: String,
    rights_note: String, // private
    cover_media_id: oid('MediaAsset'),
    status: { type: String, required: true, enum: CONTENT_STATUSES, default: 'draft' },
    lang_checked: { type: Boolean, default: false },
    proof_checked: { type: Boolean, default: false },
    final_approved: { type: Boolean, default: false },
    scheduled_at: Date,
    published_at: Date,
    unpublished_at: Date,
    archived_at: Date,
    featured: { type: Boolean, default: false },
    feature_order: Number,
    seo_title: String,
    seo_description: String,
    canonical_url: String,
    revision_no: { type: Number, required: true, default: 1 },
    search_text: { type: String, default: '' },
    search_text_folded: { type: String, default: '' },
    schedule_error: String, // set by the scheduler when a due item cannot be published; shown on the dashboard
    submission_id: oid('Submission'), // private
    dev_data: { type: Boolean, default: false }, // the development label lives in the record itself (launch-check-ignore)
  },
  ts,
);
contentSchema.index({ status: 1, published_at: -1 });
contentSchema.index({ category_id: 1, status: 1, published_at: -1 });
contentSchema.index({ 'credits.author_id': 1 });
contentSchema.index({ search_text: 'text', search_text_folded: 'text' }, { default_language: 'none' });
export const Content = model('Content', contentSchema, 'contents');

export interface ContentRevisionDoc {
  content_id: Types.ObjectId;
  revision_no: number;
  snapshot: Record<string, unknown>;
  actor_id?: Types.ObjectId | string;
  note?: string;
  created_at: Date;
}

const revisionSchema = new Schema<ContentRevisionDoc>(
  {
    content_id: oid('Content', true),
    revision_no: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    actor_id: oid('AdminUser'),
    note: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);
revisionSchema.index({ content_id: 1, revision_no: 1 }, { unique: true });
export const ContentRevision = model<ContentRevisionDoc>('ContentRevision', revisionSchema, 'content_revisions');

const authorSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 120, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    bio: String,
    photo_media_id: oid('MediaAsset'),
    is_public: { type: Boolean, required: true, default: false },
    birth_year: Number,
    birthplace: String,
    private_contact: { type: String, select: false },
    archived: { type: Boolean, default: false },
    dev_data: { type: Boolean, default: false },
  },
  ts,
);
authorSchema.index({ name: 1 });
export const Author = model('Author', authorSchema, 'authors');

const taxonomy = () =>
  new Schema(
    {
      name: { type: String, required: true, maxlength: 80, trim: true },
      slug: { type: String, required: true, unique: true, lowercase: true },
      description: String,
      sort_order: { type: Number, default: 0 },
      is_active: { type: Boolean, default: true },
      dev_data: { type: Boolean, default: false },
    },
    ts,
  );
export const Category = model('Category', taxonomy(), 'categories');
export const Topic = model('Topic', taxonomy(), 'topics');

const collectionSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    cover_media_id: oid('MediaAsset'),
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    published_at: Date,
    dev_data: { type: Boolean, default: false },
  },
  ts,
);
export const Collection = model('Collection', collectionSchema, 'collections');

const collectionItemSchema = new Schema({
  collection_id: oid('Collection', true),
  content_id: oid('Content', true),
  position: { type: Number, required: true },
});
collectionItemSchema.index({ collection_id: 1, content_id: 1 }, { unique: true });
collectionItemSchema.index({ collection_id: 1, position: 1 });
export const CollectionItem = model('CollectionItem', collectionItemSchema, 'collection_items');

const redirectSchema = new Schema({
  old_slug: { type: String, required: true, unique: true },
  entity: { type: String, required: true, enum: ['content', 'author', 'category', 'collection', 'issue'] },
  target_id: oid('Content', true),
});
export const SlugRedirect = model('SlugRedirect', redirectSchema, 'slug_redirects');
