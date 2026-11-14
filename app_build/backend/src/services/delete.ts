import type { ClientSession, Types } from 'mongoose';
import { inList } from '../lib/queries.js';
import {
  CollectionItem, Content, ContentRevision, HomepageSlot, IssueItem, SlugRedirect, Submission,
} from '../models/index.js';

/**
 * Permanently removes contents and everything that points at them, inside one transaction so a failure never leaves
 * a half-deleted piece: revisions, old-address redirects, collection and issue memberships, homepage slots.
 * A submission that was converted into one of them keeps its record but loses the link.
 * The caller checks permission, writes the audit entry and decides what may be deleted.
 */
export async function purgeContents(ids: Types.ObjectId[], session: ClientSession): Promise<number> {
  if (ids.length === 0) return 0;
  const match = (field: string) => ({ [field]: inList(ids) }) as never;
  await ContentRevision.deleteMany(match('content_id'), { session });
  await SlugRedirect.deleteMany(match('target_id'), { session });
  await CollectionItem.deleteMany(match('content_id'), { session });
  await IssueItem.deleteMany(match('content_id'), { session });
  await HomepageSlot.deleteMany(match('content_id'), { session });
  await Submission.updateMany(match('converted_content_id'), { $unset: { converted_content_id: '' } }, { session });
  const r = await Content.deleteMany({ _id: inList(ids) } as never, { session });
  return r.deletedCount;
}
