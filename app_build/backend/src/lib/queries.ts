/**
 * The single published-only filter used by every public read (editorial_workflow skill).
 * Anything public must go through this helper so unpublished content cannot leak.
 */
import mongoose from 'mongoose';

// sanitizeFilter is on globally (db/connect.ts), so internal operators are marked trusted on purpose.
export function publishedFilter(now: Date = new Date()) {
  return { status: 'published' as const, published_at: mongoose.trusted({ $lte: now }) };
}

/** Operators in filters are neutralised globally (sanitizeFilter); these helpers mark our own as trusted. */
// Typed loosely on purpose: the value is a trusted operator object that Mongoose casts per field.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const inList = (ids: unknown[]): any => mongoose.trusted({ $in: ids });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lte = (d: Date): any => mongoose.trusted({ $lte: d });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gte = (d: Date): any => mongoose.trusted({ $gte: d });

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const regex = (pattern: string): any => mongoose.trusted({ $regex: pattern });
