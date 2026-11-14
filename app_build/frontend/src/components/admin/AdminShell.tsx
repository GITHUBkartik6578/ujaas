'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSessionProvider, can, useAdmin, type AdminUser } from './session';
import { ask } from './ui';

interface NavItem { label: string; href: string; show: (u: AdminUser) => boolean }
const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', show: () => true },
  { label: 'Content', href: '/admin/content', show: () => true },
  { label: 'Authors', href: '/admin/authors', show: () => true },
  { label: 'Categories', href: '/admin/categories', show: () => true },
  { label: 'Collections', href: '/admin/collections', show: () => true },
  { label: 'E-magazine issues', href: '/admin/issues', show: (u) => can.editorUp(u.role) },
  { label: 'Submissions', href: '/admin/submissions', show: (u) => can.editorUp(u.role) },
  { label: 'Messages', href: '/admin/messages', show: (u) => can.editorUp(u.role) },
  { label: 'Media', href: '/admin/media', show: () => true },
  { label: 'Homepage', href: '/admin/homepage', show: (u) => can.chiefUp(u.role) },
  { label: 'Settings', href: '/admin/settings', show: (u) => can.admin(u.role) },
  { label: 'Activity log', href: '/admin/audit', show: (u) => can.chiefUp(u.role) },
];

const ROLE_LABEL: Record<string, string> = {
  site_admin: 'Site admin', editor_in_chief: 'Editor-in-chief', editor: 'Editor', content_manager: 'Content manager',
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
    if (dirty && !ask('Unsaved changes will be lost. Leave anyway?')) e.preventDefault();
    else setDirty(false);
  };
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <div className="shell">
      <a className="skip-link" href="#admin-main">Skip to main content</a>
      <aside className="sidebar">
        <p className="brand-line">
          <span className="brand-name">Ujaas</span> <span className="brand-scope">Admin</span>
        </p>
        <nav aria-label="Admin">
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
              if (dirty && !ask('Unsaved changes will be lost. Log out anyway?')) return;
              setDirty(false);
              await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
              router.push('/admin/login');
              router.refresh();
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main id="admin-main" className="canvas">{children}</main>
    </div>
  );
}
