import type { Metadata } from 'next';
import '@/styles/admin.css';

// The admin is never indexed, whatever the site setting (FR-034, sitemap §3).
export const metadata: Metadata = {
  title: { absolute: 'Ujaas Admin', template: '%s | Ujaas Admin' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin" lang="en">{children}</div>;
}
