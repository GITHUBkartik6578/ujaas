/**
 * Hindi (Devanagari) text helpers. Rules come from docs/data-model.md §4 and the hindi_content skill.
 * - Store NFC. Reject control characters except newline and tab. Keep ZWJ/ZWNJ in stored text.
 * - Search uses a normaliser applied to both index and query.
 */

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
const ZW = /[‌‍]/g;
const NUKTA = /़/g;
const CHANDRABINDU = /ँ/g;
const ANUSVARA = 'ं';
// Danda, double danda, quotes and general punctuation/symbols.
const PUNCT = /[\p{P}\p{S}।॥]/gu;

export function hasForbiddenControlChars(input: string): boolean {
  return CONTROL_CHARS.test(input);
}

/** NFC, normalised line endings. Does not trim inner whitespace (verse keeps its line breaks). */
export function toStoredText(input: string): string {
  return input.normalize('NFC').replace(/\r\n?/g, '\n');
}

/** Primary search form: NFC, lowercase Latin, punctuation removed, chandrabindu to anusvara, whitespace collapsed. */
export function searchNormalise(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(ZW, '')
    .replace(CHANDRABINDU, ANUSVARA)
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Secondary form with nukta folded (ग़ becomes ग). */
export function searchFolded(input: string): string {
  return searchNormalise(input).replace(NUKTA, '');
}

export function searchFields(...parts: Array<string | undefined>) {
  const joined = parts.filter(Boolean).join(' ');
  return { search_text: searchNormalise(joined), search_text_folded: searchFolded(joined) };
}

/** Count user-visible characters (grapheme clusters), so conjuncts count once. */
export function graphemeLength(input: string): number {
  const seg = new Intl.Segmenter('hi', { granularity: 'grapheme' });
  return [...seg.segment(input)].length;
}
