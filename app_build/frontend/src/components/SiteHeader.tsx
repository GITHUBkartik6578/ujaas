import Link from 'next/link';
import { SafeLink } from './SafeLink';
import { DESIGN_REVIEW, isBuilt } from '@/lib/routes';
import { getSubmissionConfig } from '@/lib/submission';

// Header order from public_site_build. "गतिविधियाँ" stays out until D-25 allows it (ASSUMPTION D-25, D-29).
const NAV: Array<{ label: string; href: string }> = [
  { label: 'हमारे बारे में', href: '/hamare-bare-mein' },
  { label: 'ई-पत्रिका', href: '/e-patrika' },
  { label: 'साहित्य', href: '/sahitya' },
  { label: 'विचार', href: '/sahitya/vichar' },
  { label: 'रचनाकार', href: '/rachnakar' },
  { label: 'अपनी रचना भेजें', href: '/rachna-bhejein' },
  { label: 'संपर्क', href: '/sampark' },
];

export async function SiteHeader() {
  const submit = await getSubmissionConfig();
  // In production only built destinations are shown; the submit link also needs the form to be open (D-03).
  const items = NAV.filter((n) => DESIGN_REVIEW || (isBuilt(n.href) && (n.href !== '/rachna-bhejein' || submit.open)));
  return (
    <header className="site-header">
      <div className="frame header-row">
        {/* DEV wordmark until the owner chooses a logo (D-27, ASSUMPTION D-27). */}
        <span className="brand">
          <Link className="wordmark" href="/">उजास</Link>
          <span className="dev-flag" lang="en">DEV</span>
        </span>
        <form action="/khoj" method="get" role="search" className="header-search">
          <label htmlFor="header-q" className="visually-hidden">खोजें</label>
          <input id="header-q" name="q" type="search" maxLength={100} placeholder="खोजें" required />
          <button type="submit" className="header-search-btn">खोजें</button>
        </form>
        {items.length > 0 && (
          <nav aria-label="मुख्य">
            <ul className="nav-list">
              {items.map((n) => (
                <li key={n.href}>
                  <SafeLink href={n.href}>{n.label}</SafeLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
