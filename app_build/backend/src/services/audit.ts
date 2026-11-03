import { AuditLog } from '../models/index.js';

export interface AuditEntry {
  actor_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  from?: string;
  to?: string;
  note?: string;
  request_id?: string;
}

/** Append one audit row. Never pass private text (submission bodies, passwords) in `note`. */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  await AuditLog.create({
    ...entry,
    actor: entry.actor_id ?? 'system',
  });
}
