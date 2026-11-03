/** Gold lotus rule used under headings (decorative; colours come from the `.ornament` rules in home.css). */
export function LotusRule({ width = 300 }: { width?: number }) {
  return (
    <svg className="ornament" width={width} height="22" viewBox="0 0 300 22" aria-hidden="true">
      <line x1="0" y1="11" x2="126" y2="11" className="ornament-line" />
      <line x1="174" y1="11" x2="300" y2="11" className="ornament-line" />
      <g className="ornament-fill">
        <path d="M150 0 Q154 8 150 11 Q146 8 150 0Z" /><path d="M150 22 Q154 14 150 11 Q146 14 150 22Z" />
        <path d="M139 11 Q147 7 150 11 Q147 15 139 11Z" /><path d="M161 11 Q153 7 150 11 Q153 15 161 11Z" />
        <circle cx="133" cy="11" r="2" /><circle cx="167" cy="11" r="2" />
      </g>
    </svg>
  );
}

/** Four-petal flourish at the ends of the genre panel. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <g className="ornament-fill">
        <path d="M20 2 Q25 14 20 20 Q15 14 20 2Z" /><path d="M20 38 Q25 26 20 20 Q15 26 20 38Z" />
        <path d="M2 20 Q14 15 20 20 Q14 25 2 20Z" /><path d="M38 20 Q26 15 20 20 Q26 25 38 20Z" />
        <circle cx="9" cy="9" r="2" /><circle cx="31" cy="9" r="2" /><circle cx="9" cy="31" r="2" /><circle cx="31" cy="31" r="2" />
      </g>
      <circle cx="20" cy="20" r="3.4" className="ornament-heart" />
    </svg>
  );
}

/** Faint mandala for the corners of the maroon bands. */
export function Mandala({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 220" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="110" cy="110" r="30" /><circle cx="110" cy="110" r="56" /><circle cx="110" cy="110" r="84" /><circle cx="110" cy="110" r="104" />
        <path d="M110 26 Q126 56 110 80 Q94 56 110 26Z" /><path d="M194 110 Q164 126 140 110 Q164 94 194 110Z" />
        <path d="M110 194 Q126 164 110 140 Q94 164 110 194Z" /><path d="M26 110 Q56 126 80 110 Q56 94 26 110Z" />
        <path d="M50 50 Q82 60 86 86 Q60 82 50 50Z" /><path d="M170 50 Q138 60 134 86 Q160 82 170 50Z" />
        <path d="M50 170 Q82 160 86 134 Q60 138 50 170Z" /><path d="M170 170 Q138 160 134 134 Q160 138 170 170Z" />
      </g>
    </svg>
  );
}

export const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
  </svg>
);

export const BookIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const PenIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /><line x1="15" y1="5" x2="19" y2="9" />
  </svg>
);
