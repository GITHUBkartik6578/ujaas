import Link from 'next/link';
import { SiteFooter } from '@/components/HomeSections';
import { SiteHeader } from '@/components/SiteHeader';

// Rendered with a real 404 status. Offers search and the main sections so a visitor is never stranded.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="frame page">
          <h1>पृष्ठ नहीं मिला</h1>
          <p>आप जो पृष्ठ खोज रहे हैं वह उपलब्ध नहीं है, या उसका पता बदल गया है।</p>
          <form action="/khoj" method="get" className="search-form" role="search">
            <label htmlFor="nf-q">खोजें</label>
            <div className="search-row">
              <input id="nf-q" name="q" type="search" maxLength={100} required />
              <button className="button" type="submit">खोजें</button>
            </div>
          </form>
          <p>
            <Link href="/sahitya">साहित्य</Link> · <Link href="/rachnakar">रचनाकार</Link> · <Link href="/sangrah">संग्रह</Link> ·{' '}
            <Link href="/">मुख्य पृष्ठ</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
