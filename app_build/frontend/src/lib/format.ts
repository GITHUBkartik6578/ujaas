/** Hindi labels for the content types stored as ASCII codes (docs/data-model.md). Types await owner confirmation. */
export const TYPE_LABEL: Record<string, string> = {
  kavita: 'कविता', ghazal: 'ग़ज़ल', geet: 'गीत', kahani: 'कहानी', laghukatha: 'लघुकथा', nibandh: 'निबंध',
  sansmaran: 'संस्मरण', vichar: 'विचार', vimarsh: 'विमर्श', samiksha: 'समीक्षा', other: 'अन्य',
};
export const typeLabel = (t: string) => TYPE_LABEL[t] ?? t;

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('hi-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}

/** Devanagari alphabet strip for the author directory (letters as on the Hindwi reference, not copied text). */
export const ALPHABET = [
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ',
  'क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ', 'ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न',
  'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह',
];
