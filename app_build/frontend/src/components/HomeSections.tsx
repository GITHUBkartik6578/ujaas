import { ArtSvg } from './ArtSvg';
import Link from 'next/link';
import type { AuthorCard, IssueCard } from '@/lib/api';
import { Picture } from './parts';
import { DESIGN_REVIEW, isBuilt } from '@/lib/routes';
import { getSubmissionConfig } from '@/lib/submission';
import { SafeLink } from './SafeLink';
import { Arrow, BookIcon, LotusRule, Mandala, PenIcon } from './home/Ornament';

export type IssueSummary = IssueCard & { editorial_intro: string | null };

/** Centred section heading with the gold lotus rule. */
function SectionHead({ id, kicker, title, light = false }: { id: string; kicker: string; title: string; light?: boolean }) {
  return (
    <div className={light ? 'section-head section-head-light' : 'section-head'}>
      <p className="section-kicker">{kicker}</p>
      <h2 id={id}>{title}</h2>
      <LotusRule />
    </div>
  );
}

/** The latest issue. Shows the real cover when there is one; otherwise a bound wine cover with the issue number. */
export function IssueShowcase({ issue }: { issue: IssueSummary }) {
  return (
    <section className="latest" id="e-patrika" aria-labelledby="issue-h">
      <div className="frame latest-grid">
        {issue.cover ? (
          <div className="latest-cover latest-cover-photo">
            <Picture cover={issue.cover} sizes="(min-width: 900px) 360px, 80vw" />
          </div>
        ) : (
          <div className="latest-cover" aria-hidden="true">
            <div className="latest-cover-frame">
              <ArtSvg file="ujaas-mark-cover.svg" scope="cov" className="latest-cover-mark" />
              <span className="latest-cover-word">उजास</span>
              <span className="latest-cover-sub">ई-पत्रिका · अंक {issue.issue_number}</span>
            </div>
          </div>
        )}
        <div className="latest-text">
          <p className="section-kicker">ई-पत्रिका</p>
          <h2 id="issue-h">नवीनतम ई-पत्रिका</h2>
          <LotusRule width={220} />
          <p className="latest-title">{issue.title}</p>
          <p className="latest-period">{issue.period_label}</p>
          {issue.editorial_intro && <p className="latest-intro">{issue.editorial_intro}</p>}
          <div className="cta-row">
            <SafeLink className="cta-btn cta-primary" href={`/e-patrika/${issue.slug}`}>
              <BookIcon size={22} /> ऑनलाइन पढ़ें
            </SafeLink>
            <SafeLink className="cta-btn cta-outline" href="/e-patrika">सभी अंक <Arrow /></SafeLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export interface WorkPick { slug: string; title: string; type: string; author: string; lines: string[] }

/** Selected (or latest) works as cards with their opening lines. Hidden when there are none. */
export function FeaturedWorks({ works, heading }: { works: WorkPick[]; heading: string }) {
  return (
    <section className="works" aria-labelledby="works-h">
      <div className="frame">
        <SectionHead id="works-h" kicker="संपादकीय चयन" title={heading} />
        <ul className="works-grid">
          {works.map((w) => (
            <li key={w.slug}>
              <article className="work-card">
                <div className="work-band" aria-hidden="true">
                  <svg width="160" height="60" viewBox="0 0 160 60">
                    <g className="band-orn-line"><line x1="0" y1="30" x2="58" y2="30" /><line x1="102" y1="30" x2="160" y2="30" /><circle cx="80" cy="30" r="20" /></g>
                    <g className="band-orn-fill"><path d="M80 12 Q86 24 80 30 Q74 24 80 12Z" /><path d="M80 48 Q86 36 80 30 Q74 36 80 48Z" /><path d="M62 30 Q74 24 80 30 Q74 36 62 30Z" /><path d="M98 30 Q86 24 80 30 Q86 36 98 30Z" /></g>
                  </svg>
                </div>
                <div className="work-body">
                  <span className="work-type">{w.type}</span>
                  <h3 className="work-title"><Link href={`/rachna/${w.slug}`}>{w.title}</Link></h3>
                  {w.author && <p className="work-author">{w.author}</p>}
                  {w.lines.length > 0 && <p className="work-lines">{w.lines.slice(0, 3).join(' / ')}</p>}
                </div>
              </article>
            </li>
          ))}
        </ul>
        <p className="section-more"><SafeLink href="/sahitya">सभी रचनाएँ <Arrow /></SafeLink></p>
      </div>
    </section>
  );
}

/** Writers with their published count; no photographs until the owner supplies them. Hidden when there are none. */
export function AuthorsRow({ authors }: { authors: AuthorCard[] }) {
  return (
    <section className="writers" id="rachnakar" aria-labelledby="authors-h">
      <div className="frame">
        <SectionHead id="authors-h" kicker="हमारे रचनाकार" title="रचनाकार परिचय" />
        <ul className="writers-grid">
          {authors.map((a) => (
            <li key={a.slug}>
              <Link className="writer" href={`/rachnakar/${a.slug}`}>
                {a.photo ? (
                  <span className="writer-photo"><Picture cover={a.photo} sizes="116px" /></span>
                ) : (
                  <span className="writer-initial" aria-hidden="true">{[...a.name][0]}</span>
                )}
                <span className="writer-name">{a.name}</span>
                <span className="writer-count">{a.works_count ?? 0} रचनाएँ</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="section-more"><SafeLink href="/rachnakar">सभी रचनाकार <Arrow /></SafeLink></p>
      </div>
    </section>
  );
}

/** Dark band that leads into the विचार category. */
export function DiscourseBand() {
  if (!isBuilt('/sahitya/vichar') && !DESIGN_REVIEW) return null;
  return (
    <section className="discourse" aria-labelledby="discourse-h">
      <Mandala className="discourse-mandala" />
      <div className="frame discourse-inner">
        <p className="section-kicker">विचार</p>
        <h2 id="discourse-h">विचार और साहित्यिक विमर्श</h2>
        <p>विचारशील निबंध, सांस्कृतिक चर्चाएँ और साहित्यिक दृष्टिकोण — गंभीर संवाद के लिए उजास का खुला मंच।</p>
        <SafeLink className="cta-btn cta-gold" href="/sahitya/vichar">विमर्श पढ़ें <Arrow /></SafeLink>
      </div>
    </section>
  );
}

const STEPS = ['रचना प्राप्ति', 'संपादकीय समीक्षा', 'चयन', 'भाषा-संपादन', 'प्रूफरीडिंग', 'अंतिम स्वीकृति', 'प्रकाशन'];
const DIGITS = ['१', '२', '३', '४', '५', '६', '७'];

/** The closing invitation exists only once the submission form is open (D-03; no decorative buttons). */
export async function SubmitCta() {
  const cfg = await getSubmissionConfig();
  if (!(cfg.open && isBuilt('/rachna-bhejein')) && !DESIGN_REVIEW) return null;
  return (
    <section className="submit" aria-labelledby="cta-h">
      <div className="frame">
        <div className="submit-card">
          <div className="submit-top">
            <div>
              <h2 id="cta-h">अपनी रचना भेजें</h2>
              <p>उजास हर रचनाकार का स्वागत करता है। भेजी गई प्रत्येक रचना संपादकीय समीक्षा से गुज़रती है — कोई भी रचना स्वतः प्रकाशित नहीं की जाती।</p>
            </div>
            <SafeLink className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> रचना भेजें</SafeLink>
          </div>
          <div className="submit-steps">
            <p className="section-kicker">संपादकीय प्रक्रिया</p>
            <ol aria-label="संपादकीय प्रक्रिया के चरण">
              {STEPS.map((s, i) => (
                <li key={s}><span className="step-num" aria-hidden="true">{DIGITS[i]}</span>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

const FOOTER_LINKS: Array<{ label: string; href: string }> = [
  { label: 'मुख्य पृष्ठ', href: '/' },
  { label: 'हमारे बारे में', href: '/hamare-bare-mein' },
  { label: 'संपादकीय', href: '/sampadkiya' },
  { label: 'ई-पत्रिका', href: '/e-patrika' },
  { label: 'साहित्य', href: '/sahitya' },
  { label: 'रचनाकार', href: '/rachnakar' },
  { label: 'संग्रह', href: '/sangrah' },
  { label: 'खोज', href: '/khoj' },
  { label: 'गतिविधियाँ', href: '/gatividhiyan' },
  { label: 'संपर्क', href: '/sampark' },
];

const POLICY_LINKS: Array<{ label: string; href: string }> = [
  { label: 'गोपनीयता नीति', href: '/niti/gopniyata' },
  { label: 'उपयोग की शर्तें', href: '/niti/upyog-ki-sharten' },
  { label: 'कॉपीराइट और रचना नीति', href: '/niti/copyright-aur-rachna-niti' },
];

const FOOTER_GENRES: Array<{ label: string; type: string }> = [
  { label: 'कविता', type: 'kavita' }, { label: 'ग़ज़ल', type: 'ghazal' }, { label: 'गीत', type: 'geet' }, { label: 'कहानी', type: 'kahani' },
  { label: 'लघुकथा', type: 'laghukatha' }, { label: 'संस्मरण', type: 'sansmaran' }, { label: 'निबंध', type: 'nibandh' },
];

/**
 * Wine close. Contact details, social links and policy pages appear only once the owner supplies or approves
 * them (public_site_build, content_safety); the copyright year is left out until the owner sets it.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="frame footer-grid">
        <div className="footer-brand">
          <Link className="footer-logo" href="/" aria-label="उजास — मुख्य पृष्ठ">
            <ArtSvg file="ujaas-mark-light.svg" scope="ftr" className="footer-mark" />
            <span>
              <span className="footer-word">उजास</span>
              <span className="footer-tag">अपनी बात — अपना मंच</span>
            </span>
          </Link>
          <p>हिंदी साहित्य, रचनात्मक अभिव्यक्ति, संस्कृति और सार्थक संवाद का एक विचारशील डिजिटल घर।</p>
        </div>
        <nav aria-label="त्वरित लिंक">
          <h2 className="footer-h">त्वरित लिंक</h2>
          <ul className="footer-links">
            {FOOTER_LINKS.filter((l) => isBuilt(l.href)).map((l) => (
              <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="साहित्य">
          <h2 className="footer-h">साहित्य</h2>
          <ul className="footer-links">
            {FOOTER_GENRES.map((g) => (
              <li key={g.type}><Link href={`/sahitya?type=${g.type}`}>{g.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="frame footer-base">
        <p>उजास — अपनी बात, अपना मंच</p>
        <nav className="footer-policy" aria-label="नीतियाँ">
          {POLICY_LINKS.filter((l) => isBuilt(l.href)).map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}
