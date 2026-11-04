import { LotusRule } from '../home/Ornament';

/** Centred section heading: kicker, h2, lotus rule and an optional line under it. */
export function SectionHead({ kicker, title, id, children, as: Tag = 'h2' }: { kicker?: string; title: string; id?: string; children?: React.ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <div className="pg-head">
      {kicker && <p className="pg-kick">{kicker}</p>}
      <Tag id={id} className="pg-h2">{title}</Tag>
      <LotusRule width={300} />
      {children}
    </div>
  );
}

/** Wine closing band: heading and line at the left, actions at the right. */
export function InviteBand({ id, title, text, children }: { id: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="pg-invite" aria-labelledby={id}>
      <div className="pg-wrap pg-invite-row">
        <div>
          <h2 id={id}>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="cta-row">{children}</div>
      </div>
    </section>
  );
}

/** Framed empty or status message with a round mark. */
export function EmptyBox({ title, mark, children, headingLevel = 2 }: { title: string; mark?: React.ReactNode; children?: React.ReactNode; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="pg-empty" role="status">
      {mark && <span className="pg-empty-mark" aria-hidden="true">{mark}</span>}
      <H className="pg-empty-title">{title}</H>
      {children}
    </div>
  );
}

const digits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
/** Devanagari numerals for counts and numbering in display text. */
export const dev = (n: number | string) => String(n).replace(/[0-9]/g, (d) => digits[Number(d)]!);

export const SendIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 2 2 10.5l7 2.6L19 5l-8.2 9.4V21l3.6-4.4L18 19z" /></svg>
);
export const SearchIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.2" y2="16.2" /></svg>
);
export const CheckIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
);
export const MailIcon = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
export const ListIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4.5" cy="6" r="1.2" fill="currentColor" /><circle cx="4.5" cy="12" r="1.2" fill="currentColor" /><circle cx="4.5" cy="18" r="1.2" fill="currentColor" /></svg>
);
