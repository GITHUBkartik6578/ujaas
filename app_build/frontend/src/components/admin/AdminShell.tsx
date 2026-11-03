'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSessionProvider, can, useAdmin, type AdminUser } from './session';
import { ask } from './ui';

interface NavItem { label: string; href: string; show: (u: AdminUser) => boolean }
const NAV: NavItem[] = [
  { label: 'डैशबोर्ड', href: '/admin', show: () => true },
  { label: 'रचनाएँ', href: '/admin/content', show: () => true },
  { label: 'रचनाकार', href: '/admin/authors', show: () => true },
  { label: 'श्रेणियाँ', href: '/admin/categories', show: () => true },
  { label: 'संग्रह', href: '/admin/collections', show: () => true },
  { label: 'ई-पत्रिका अंक', href: '/admin/issues', show: (u) => can.editorUp(u.role) },
  { label: 'प्रविष्टियाँ', href: '/admin/submissions', show: (u) => can.editorUp(u.role) },
  { label: 'संदेश', href: '/admin/messages', show: (u) => can.editorUp(u.role) },
  { label: 'चित्र', href: '/admin/media', show: () => true },
  { label: 'मुख्य पृष्ठ', href: '/admin/homepage', show: (u) => can.chiefUp(u.role) },
  { label: 'सेटिंग्स', href: '/admin/settings', show: (u) => can.admin(u.role) },
  { label: 'गतिविधि लॉग', href: '/admin/audit', show: (u) => can.chiefUp(u.role) },
];

const ROLE_LABEL: Record<string, string> = {
  site_admin: 'साइट प्रशासक', editor_in_chief: 'प्रधान संपादक', editor: 'संपादक', content_manager: 'सामग्री प्रबंधक',
};

/** The controls only hide what a role cannot do; the API refuses it again on every call. */
export function AdminShell({ user, csrf, children }: { user: AdminUser; csrf: string; children: React.ReactNode }) {
  return (
    <AdminSessionProvider user={user} csrf={csrf}>
      <Frame>{children}</Frame>
    </AdminSessionProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { user, request, dirty, setDirty } = useAdmin();
  const path = usePathname();
  const router = useRouter();
  const leave = (e: React.MouseEvent) => {
    if (dirty && !ask('सहेजे न गए बदलाव खो जाएँगे। फिर भी छोड़ें?')) e.preventDefault();
    else setDirty(false);
  };
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <div className="shell">
      <a className="skip-link" href="#admin-main">मुख्य सामग्री पर जाएँ</a>
      <aside className="sidebar">
        <p className="brand-line">
          <span className="brand-name">उजास</span> <span className="brand-scope">प्रशासन</span>
        </p>
        <nav aria-label="प्रशासन">
          <ul>
            {NAV.filter((n) => n.show(user)).map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={active(n.href) ? 'page' : undefined} onClick={leave}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="me">
          <p className="me-name">{user.display_name}</p>
          <p className="me-role">{ROLE_LABEL[user.role] ?? user.role}</p>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              if (dirty && !ask('सहेजे न गए बदलाव खो जाएँगे। फिर भी लॉग आउट करें?')) return;
              setDirty(false);
              await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
              router.push('/admin/login');
              router.refresh();
            }}
          >
            लॉग आउट
          </button>
        </div>
      </aside>
      <main id="admin-main" className="canvas">{children}</main>
    </div>
  );
}
