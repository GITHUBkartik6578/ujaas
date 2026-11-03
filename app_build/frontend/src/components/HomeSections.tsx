import Link from 'next/link';
import type { AuthorCard, IssueCard } from '@/lib/api';
import { Picture } from './parts';
import { DESIGN_REVIEW, isBuilt } from '@/lib/routes';
import { getSubmissionConfig } from '@/lib/submission';
import { SafeLink } from './SafeLink';

export type IssueSummary = IssueCard & { editorial_intro: string | null };

/** Square plate, spare text. Shows the real cover when there is one; otherwise a flat plate with the issue number. */
export function IssueShowcase({ issue }: { issue: IssueSummary }) {
  return (
    <section className="showcase" aria-labelledby="issue-h">
      <div className="frame showcase-grid">
        {issue.cover ? (
          <div className="plate plate-cover">
            <Picture cover={issue.cover} sizes="(min-width: 700px) 40vw, 90vw" />
          </div>
        ) : (
          <div className="plate" aria-hidden="true">
            <span>अंक {issue.issue_number}</span>
          </div>
        )}
        <div className="showcase-text">
          <h2 id="issue-h">नवीनतम ई-पत्रिका</h2>
          <p className="showcase-title">{issue.title}</p>
          <p className="muted">{issue.period_label}</p>
          {issue.editorial_intro && <p>{issue.editorial_intro}</p>}
          <div className="cells">
            <SafeLink className="cell cell-primary" href={`/e-patrika/${issue.slug}`}>ऑनलाइन पढ़ें</SafeLink>
            <SafeLink className="cell cell-secondary" href="/e-patrika">सभी अंक</SafeLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Authors as a wrapped grid of text modules (no photographs yet). Hidden when there are none. */
export function AuthorsRow({ authors }: { authors: AuthorCard[] }) {
  return (
    <section className="authors" aria-labelledby="authors-h">
      <div className="frame authors-head">
        <h2 id="authors-h">रचनाकार</h2>
        <SafeLink href="/rachnakar">सभी रचनाकार</SafeLink>
      </div>
      <ul className="frame authors-row">
        {authors.map((a) => (
          <li key={a.slug} className="author-module">
            <Link href={`/rachnakar/${a.slug}`}>
              <span className="author-name">{a.name}</span>
              <span className="author-role">{a.works_count ?? 0} रचनाएँ</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The closing action exists only once the submission page does (no decorative buttons). */
export async function SubmitCta() {
  const cfg = await getSubmissionConfig();
  if (!(cfg.open && isBuilt('/rachna-bhejein')) && !DESIGN_REVIEW) return null;
  return (
    <section className="cta" aria-labelledby="cta-h">
      <div className="frame cta-grid">
        <div className="cta-text">
          <h2 id="cta-h">आपकी रचना, हमारे पाठकों तक</h2>
          <p>कविता, कहानी, निबंध या विचार: अपनी मौलिक रचना हमें भेजिए। हर रचना संपादकीय समीक्षा के बाद ही प्रकाशित होती है।</p>
          <SafeLink className="button button-light" href="/rachna-bhejein">अपनी रचना भेजें</SafeLink>
        </div>
      </div>
    </section>
  );
}

const FOOTER_LINKS: Array<{ label: string; href: string }> = [
  { label: 'ई-पत्रिका', href: '/e-patrika' },
  { label: 'साहित्य', href: '/sahitya' },
  { label: 'रचनाकार', href: '/rachnakar' },
  { label: 'संग्रह', href: '/sangrah' },
  { label: 'खोज', href: '/khoj' },
  { label: 'संपर्क', href: '/sampark' },
];

/**
 * Client's designed close in maroon. Policy links, contact and social appear only once the owner supplies
 * or approves them (public_site_build, content_safety).
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="frame footer-grid">
        <p className="footer-name">
          उजास <span className="footer-tag">अपनी बात — अपना मंच</span>
        </p>
        <nav aria-label="त्वरित लिंक">
          <ul className="footer-links">
            {FOOTER_LINKS.filter((l) => isBuilt(l.href)).map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
