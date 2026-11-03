/** Site-wide constants read on the server. */
export const SITE_URL = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
/** Indexing is off everywhere except production with an explicit flag (staging stays noindex). */
export const ALLOW_INDEXING = process.env.ALLOW_INDEXING === '1';

export const absUrl = (path: string) => `${SITE_URL}${path}`;

const BACKSLASH = String.fromCharCode(92);

/** JSON-LD must not be able to close its own script tag: every "<" becomes a backslash-u003c escape. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, `${BACKSLASH}u003c`);
