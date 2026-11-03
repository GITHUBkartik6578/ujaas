import { Schema, model, type Types } from 'mongoose';

const ts = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } } as const;

export const SUBMISSION_STATUSES = [
  'pending_review', 'under_review', 'revision_requested', 'approved', 'rejected', 'converted', 'withdrawn',
] as const;

/** All fields are private. No public serializer may return a Submission document. */
const submissionSchema = new Schema(
  {
    reference_id: { type: String, required: true, unique: true },
    display_name: { type: String, required: true, maxlength: 80 },
    pen_name: { type: String, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    title: { type: String, required: true, maxlength: 160 },
    creation_type: { type: String, required: true },
    body: { type: String, required: true },
    description: { type: String, maxlength: 300 },
    consent_original: { type: Boolean, required: true },
    consent_publication: { type: Boolean, required: true },
    consent_privacy: { type: Boolean, required: true },
    consent_text_version: { type: String, required: true },
    consent_at: { type: Date, required: true },
    ip_hash: { type: String, required: true },
    ua_hash: { type: String, required: true },
    dedupe_hash: { type: String, required: true },
    status: { type: String, required: true, enum: SUBMISSION_STATUSES, default: 'pending_review' },
    assigned_to: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    converted_content_id: { type: Schema.Types.ObjectId, ref: 'Content' },
  },
  ts,
);
submissionSchema.index({ status: 1, created_at: -1 });
submissionSchema.index({ dedupe_hash: 1, created_at: -1 });
export const Submission = model('Submission', submissionSchema, 'submissions');

export interface SubmissionEventDoc {
  submission_id: Types.ObjectId;
  from_status?: string;
  to_status?: string;
  actor: string;
  kind?: string; // submitted, status, note, assign, convert
  note?: string;
  created_at: Date;
}

const eventSchema = new Schema<SubmissionEventDoc>(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    from_status: String,
    to_status: String,
    actor: { type: String, required: true }, // admin id or 'system'
    kind: String,
    note: { type: String, maxlength: 2000 }, // private
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);
eventSchema.index({ submission_id: 1, created_at: 1 });
export const SubmissionEvent = model<SubmissionEventDoc>('SubmissionEvent', eventSchema, 'submission_events');

const contactSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true },
    subject: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 1000 },
    ip_hash: { type: String, required: true },
    status: { type: String, enum: ['new', 'handled'], default: 'new' },
  },
  ts,
);
export const ContactMessage = model('ContactMessage', contactSchema, 'contact_messages');

// Wording is owner/legal text (D-03). This collection stays empty until the owner supplies it, and while it is
// empty the submission form is closed. dev_data rows exist only in local and staging and are refused in production.
const consentTextSchema = new Schema({
  version: { type: String, required: true, unique: true },
  text_original: { type: String, required: true }, // the original-work declaration
  text_publication: { type: String, required: true }, // permission to publish after review
  text_privacy: { type: String, required: true }, // privacy-policy acknowledgement
  approved_at: { type: Date, required: true },
  dev_data: { type: Boolean, default: false },
});
export const ConsentText = model('ConsentText', consentTextSchema, 'consent_texts');
