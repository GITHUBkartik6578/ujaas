import { searchFields } from './hindi.js';

/**
 * Builds the normalised search fields stored on every content record (docs/data-model.md §4).
 * The CMS calls this on every save; seeds and tests call it too, so index and query always agree.
 */
export function buildContentSearchFields(input: {
  title: string;
  excerpt: string;
  body: string;
  authorNames: string[];
  categoryName?: string;
}) {
  return searchFields(input.title, input.excerpt, input.body, ...input.authorNames, input.categoryName);
}

/** First lines of a piece for the home stage: verse keeps its line breaks, prose uses the excerpt. */
export function openingLines(body: string, bodyFormat: 'verse' | 'prose', excerpt: string, max = 3): string[] {
  if (bodyFormat === 'verse') {
    return body.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, max);
  }
  return [excerpt];
}
