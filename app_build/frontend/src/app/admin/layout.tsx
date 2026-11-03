import type { Metadata } from 'next';
import '@/styles/admin.css';

// The admin is never indexed, whatever the site setting (FR-034, sitemap §3).
export const metadata: Metadata = {
  title: { default: 'उजास प्रशासन', template: '%s | उजास प्रशासन' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
