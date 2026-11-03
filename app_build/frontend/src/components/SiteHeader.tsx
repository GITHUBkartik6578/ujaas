import { ArtSvg } from './ArtSvg';
import Link from 'next/link';
import { DESIGN_REVIEW, isBuilt } from '@/lib/routes';
import { getSubmissionConfig } from '@/lib/submission';
import { HeaderNav, type NavItem } from './HeaderNav';
import { GENRES } from './home/LiteraryCategories';

// Header order from the approved homepage design. "गतिविधियाँ" stays out until D-25 allows it (ASSUMPTION D-25, D-29).
const NAV: NavItem[] = [
  { label: 'मुख्य पृष्ठ', href: '/' },
  { label: 'हमारे बारे में', href: '/hamare-bare-mein' },
  { label: 'ई-पत्रिका', href: '/e-patrika' },
  { label: 'साहित्य', href: '/sahitya', children: GENRES.map((g) => ({ label: g.label, href: g.href })) },
  { label: 'विचार', href: '/sahitya/vichar' },
  { label: 'रचनाकार', href: '/rachnakar' },
  { label: 'अपनी रचना भेजें', href: '/rachna-bhejein' },
  { label: 'संपर्क', href: '/sampark' },
];

const builtPath = (href: string) => isBuilt(href.split('?')[0]!);

export async function SiteHeader() {
  const submit = await getSubmissionConfig();
  // Only built destinations are shown; the submit link also needs the form to be open (D-03).
  const shows = (href: string) => DESIGN_REVIEW || (builtPath(href) && (href !== '/rachna-bhejein' || submit.open));
  const items = NAV.filter((n) => shows(n.href)).map((n) => ({ ...n, children: n.children?.filter((c) => shows(c.href)) }));
  return (
    <header className="site-header">
      <div className="top-strip">
        <div className="frame top-strip-row">
          <p className="top-strip-note">
            <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
              <path className="strip-feather" d="M23 2C15 3 8 8 6 16l-1 4 2-1c7-2 12-8 16-17z" />
              <path className="strip-feather-cut" d="M3 24 L15 10" />
            </svg>
            हिंदी साहित्य की समकालीन डिजिटल पत्रिका
          </p>
          <ul className="top-strip-links">
            {shows('/e-patrika') && <li><Link href="/e-patrika">ई-पत्रिका</Link></li>}
            {shows('/rachna-bhejein') && <li><Link href="/rachna-bhejein">अपनी रचना भेजें</Link></li>}
          </ul>
        </div>
      </div>
      <div className="frame header-row">
        <Link className="brand" href="/" aria-label="उजास — अपनी बात, अपना मंच — मुख्य पृष्ठ">
          <ArtSvg file="ujaas-mark.svg" scope="hdr" className="brand-mark" />
          <span className="brand-text">
            <span className="brand-word">उजास</span>
            <span className="brand-tag">अपनी बात — अपना मंच</span>
          </span>
        </Link>
        <HeaderNav items={items} />
      </div>
    </header>
  );
}
