import sanitizeHtml from 'sanitize-html';

/** Remove every tag. Used for plain-text fields (titles, names, submissions). */
export function stripHtml(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
