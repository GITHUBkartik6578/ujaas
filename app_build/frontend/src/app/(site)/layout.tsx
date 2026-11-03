import { SiteFooter } from '@/components/HomeSections';
import { SiteHeader } from '@/components/SiteHeader';

/** Public shell: skip link, header, main, footer. The admin has its own shell under /admin. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">मुख्य सामग्री पर जाएँ</a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
