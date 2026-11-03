'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

export interface NavItem { label: string; href: string; children?: Array<{ label: string; href: string }> }

const Chevron = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.2" y2="16.2" />
  </svg>
);

/**
 * Desktop menu with one genre dropdown, a search toggle and, below 1300px, a menu button that opens a panel
 * with large tap targets. Escape closes whatever is open; choosing a link closes the menu.
 */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [drop, setDrop] = useState<string | null>(null);
  const [search, setSearch] = useState(false);
  const ids = useId();
  const closeAll = () => { setMenu(false); setDrop(null); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenu(false); setDrop(null); setSearch(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const current = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]!));

  return (
    <>
      <nav className="main-nav" aria-label="मुख्य">
        <ul className="nav-list">
          {items.map((n) => (
            <li key={n.href} className="nav-item">
              {n.children && n.children.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="nav-link"
                    aria-expanded={drop === n.href}
                    aria-controls={`${ids}-${n.label}`}
                    onClick={() => setDrop(drop === n.href ? null : n.href)}
                  >
                    {n.label} <Chevron />
                  </button>
                  {drop === n.href && (
                    <ul className="nav-drop" id={`${ids}-${n.label}`}>
                      <li><Link href={n.href} onClick={closeAll}>सभी {n.label}</Link></li>
                      {n.children.map((c) => (
                        <li key={c.href}><Link href={c.href} onClick={closeAll}>{c.label}</Link></li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link className={current(n.href) ? 'nav-link nav-current' : 'nav-link'} href={n.href} aria-current={current(n.href) ? 'page' : undefined}>
                  {n.href === '/' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z" /></svg>
                  )}
                  {n.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="header-tools">
        <button type="button" className="icon-btn" aria-label="खोजें" aria-expanded={search} aria-controls={`${ids}-search`} onClick={() => setSearch(!search)}>
          <SearchIcon />
        </button>
        <button
          type="button"
          className="icon-btn menu-btn"
          aria-label={menu ? 'मेनू बंद करें' : 'मेनू खोलें'}
          aria-expanded={menu}
          aria-controls={`${ids}-menu`}
          onClick={() => { setMenu(!menu); setDrop(null); }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menu ? <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></> : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>}
          </svg>
        </button>
      </div>

      {search && (
        <div className="header-search-bar" id={`${ids}-search`}>
          <form action="/khoj" method="get" role="search" className="frame header-search">
            <label htmlFor={`${ids}-q`}>खोजें</label>
            <input id={`${ids}-q`} name="q" type="search" maxLength={100} placeholder="रचना, रचनाकार या विषय" required />
            <button type="submit" className="cta-btn cta-primary">खोजें</button>
          </form>
        </div>
      )}

      {menu && (
        <div className="mobile-menu" id={`${ids}-menu`}>
          <nav className="frame" aria-label="मोबाइल">
            <ul className="mobile-list">
              {items.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} onClick={closeAll} aria-current={current(n.href) ? 'page' : undefined}>{n.label}</Link>
                </li>
              ))}
            </ul>
            {items.find((n) => n.children?.length) && (
              <>
                <p className="mobile-kicker">साहित्यिक विधाएँ</p>
                <ul className="mobile-genres">
                  {items.find((n) => n.children?.length)!.children!.map((c) => (
                    <li key={c.href}><Link href={c.href} onClick={closeAll}>{c.label}</Link></li>
                  ))}
                </ul>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
