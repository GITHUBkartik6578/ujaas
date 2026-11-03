import { Schema, model, type Types } from 'mongoose';
import { ROLES, type Role } from '../lib/workflow.js';

// Explicit interface: Mongoose 9's schema inference collapses with custom timestamp field names.
export interface AdminUserDoc {
  email: string;
  display_name: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  failed_logins: number;
  locked_until?: Date;
  totp_secret?: string;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const adminUserSchema = new Schema<AdminUserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    display_name: { type: String, required: true, maxlength: 80, trim: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ROLES },
    is_active: { type: Boolean, required: true, default: true },
    failed_logins: { type: Number, default: 0 },
    locked_until: { type: Date },
    totp_secret: { type: String, select: false }, // P1 (FR-048); encrypted at rest when used
    last_login_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const AdminUser = model<AdminUserDoc>('AdminUser', adminUserSchema, 'admin_users');
export type { Types };

export interface AuditLogDoc {
  actor_id?: Types.ObjectId | string;
  actor: string;
  action: string;
  entity: string;
  entity_id?: string;
  from?: string;
  to?: string;
  note?: string;
  request_id?: string;
  created_at: Date;
}

/** Append-only. Update and delete paths are blocked at the model level. */
const auditSchema = new Schema<AuditLogDoc>(
  {
    actor_id: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    actor: { type: String, required: true }, // 'system' or the admin's id as string
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entity_id: { type: String },
    from: { type: String },
    to: { type: String },
    note: { type: String, maxlength: 2000 },
    request_id: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

const BLOCKED = [
  'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
  'deleteOne', 'deleteMany', 'findOneAndDelete',
] as const;
for (const op of BLOCKED) {
  auditSchema.pre(op as 'updateOne', function () {
    throw new Error('audit_logs is append-only');
  });
}
auditSchema.pre('save', function () {
  if (!this.isNew) throw new Error('audit_logs is append-only');
});
auditSchema.index({ entity: 1, entity_id: 1, created_at: -1 });
auditSchema.index({ created_at: -1 });

export const AuditLog = model<AuditLogDoc>('AuditLog', auditSchema, 'audit_logs');
