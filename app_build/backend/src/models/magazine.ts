import { Schema, model } from 'mongoose';

const ts = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } } as const;

const issueSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    issue_number: { type: Number, required: true, unique: true },
    volume: String,
    period_label: { type: String, required: true }, // Hindi period text
    publication_date: { type: Date, required: true },
    cover_media_id: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    editorial_intro: String,
    publication_details: String, // publisher, editor; ISSN only if the owner supplies it (D-19)
    pdf_media_id: { type: Schema.Types.ObjectId, ref: 'MediaAsset' }, // unused until D-08 allows PDF
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    show_in_archive: { type: Boolean, default: true },
    published_at: Date,
    dev_data: { type: Boolean, default: false },
  },
  ts,
);
issueSchema.index({ status: 1, publication_date: -1 });
export const MagazineIssue = model('MagazineIssue', issueSchema, 'magazine_issues');

const issueItemSchema = new Schema({
  issue_id: { type: Schema.Types.ObjectId, ref: 'MagazineIssue', required: true },
  content_id: { type: Schema.Types.ObjectId, ref: 'Content', required: true },
  position: { type: Number, required: true },
  section_label: String,
});
issueItemSchema.index({ issue_id: 1, content_id: 1 }, { unique: true });
issueItemSchema.index({ issue_id: 1, position: 1 });
export const IssueItem = model('IssueItem', issueItemSchema, 'issue_items');
