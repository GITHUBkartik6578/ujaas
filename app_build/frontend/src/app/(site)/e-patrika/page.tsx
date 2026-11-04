import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type IssueCard, type Paged } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { Pagination } from '@/components/parts';
import { Arrow, BookIcon } from '@/components/home/Ornament';
import { dev, EmptyBox, InviteBand, SectionHead, SendIcon } from '@/components/page/Blocks';
import { IssueCover } from '@/components/page/IssueCover';
import { GoldBand, PageHero } from '@/components/page/PageHero';
import { ArtSvg } from '@/components/ArtSvg';

export const metadata: Metadata = {
  title: 'ई-पत्रिका',
  description: 'उजास के सभी अंक: ऑनलाइन पढ़ें।',
  alternates: { canonical: absUrl('/e-patrika') },
};
const PAGE_SIZE = 12;
interface Archive extends Paged<IssueCard> { years: number[]; current: (IssueCard & { editorial_intro: string | null }) | null }

/** The current issue first, then every issue newest first with a year filter. Before the first issue: an honest empty page. */
export default async function MagazinePage({ searchParams }: { searchParams: Promise<{ page?: string; year?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const yearNum = Number(sp.year);
  const year = Number.isInteger(yearNum) && yearNum > 1900 && yearNum < 2200 ? yearNum : undefined;
  const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), ...(year ? { year: String(year) } : {}) });
  const [data, submit] = await Promise.all([api<Archive>(`/issues?${qs}`), getSubmissionConfig()]);
  const none = data.total === 0 && !data.current && !year;
  const cur = data.current && !year && page === 1 ? data.current : null;

  return (
    <>
      <PageHero
        art="epatrika" id="kp-h1" title="ई-पत्रिका" eyebrow="अंक दर अंक, शब्दों का उजास"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'ई-पत्रिका' }]}
        lead="उजास के सभी अंक, एक ही जगह — नवीनतम अंक से लेकर पूरे संग्रह तक, ऑनलाइन पढ़ें।"
      >
        <div className="ph-ctas">
          {none ? (
            <Link className="cta-btn cta-primary" href="/sahitya"><BookIcon /> साहित्य पढ़ें</Link>
          ) : (
            <>
              {data.current && <Link className="cta-btn cta-primary" href={`/e-patrika/${data.current.slug}`}><BookIcon /> नवीनतम अंक पढ़ें</Link>}
              <a className="cta-btn cta-outline" href="#kp-archive">सभी अंक देखें</a>
            </>
          )}
        </div>
      </PageHero>
      <GoldBand />

      {none ? (
        <section className="pg-sec" aria-labelledby="kp-empty-h">
          <div className="pg-wrap">
            <div className="pg-empty" role="status">
              <ArtSvg file="ujaas-mark.svg" scope="kp-empty" className="kp-empty-mark" />
              <h2 id="kp-empty-h" className="pg-empty-title">पहला अंक जल्द आ रहा है</h2>
              <p>अभी कोई अंक प्रकाशित नहीं हुआ है। तब तक उजास पर प्रकाशित साहित्य पढ़िए।</p>
              <div className="cta-row"><Link className="cta-btn cta-primary" href="/sahitya">साहित्य पढ़ें</Link></div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {cur && (
            <section className="pg-sec kp-latest-sec" aria-labelledby="kp-latest-h">
              <div className="pg-wrap kp-latest">
                <Link href={`/e-patrika/${cur.slug}`} tabIndex={-1} aria-hidden="true" className="kp-cover-link">
                  <IssueCover i={cur} large priority />
                </Link>
                <div>
                  <p className="pg-kick-line">नवीनतम अंक</p>
                  <h2 id="kp-latest-h" className="pg-h2">{cur.title}</h2>
                  <p className="kp-facts">
                    <span>अंक {dev(cur.issue_number)}</span>
                    {cur.volume && <><span aria-hidden="true">·</span><span>खंड {cur.volume}</span></>}
                    <span aria-hidden="true">·</span><span>{cur.period_label}</span>
                  </p>
                  {cur.editorial_intro && <p className="kp-intro">{cur.editorial_intro}</p>}
                  <div className="cta-row">
                    <Link className="cta-btn cta-primary" href={`/e-patrika/${cur.slug}`}>अंक पढ़ें <Arrow /></Link>
                    <Link className="cta-btn cta-outline" href="/sampadkiya">संपादकीय</Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section id="kp-archive" className="pg-sec pg-ivory" aria-labelledby="kp-archive-h">
            <div className="pg-wrap">
              <SectionHead kicker="पूरा संग्रह" title="सभी अंक" id="kp-archive-h" />
              {data.years.length > 0 && (
                <nav className="pg-chips kp-years" aria-label="वर्ष">
                  <Link className="pg-chip" href="/e-patrika" aria-current={!year ? 'page' : undefined}>सभी वर्ष</Link>
                  {data.years.map((y) => (
                    <Link key={y} className="pg-chip" href={`/e-patrika?year=${y}`} aria-current={year === y ? 'page' : undefined}>{y}</Link>
                  ))}
                </nav>
              )}
              {data.items.length === 0 ? (
                <EmptyBox title="इस वर्ष का कोई अंक नहीं है">
                  <div className="cta-row"><Link className="cta-btn cta-outline" href="/e-patrika">सभी अंक</Link></div>
                </EmptyBox>
              ) : (
                <>
                  <ul className="kp-grid">
                    {data.items.map((i, n) => (
                      <li key={i.slug}>
                        <Link className="kp-tile" href={`/e-patrika/${i.slug}`}>
                          <IssueCover i={i} tone={n} />
                          <span className="kp-tile-title">{i.title}</span>
                          <span className="kp-tile-meta">अंक {dev(i.issue_number)}{i.volume ? ` · खंड ${i.volume}` : ''} · {i.period_label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Pagination basePath="/e-patrika" page={data.page} pageSize={data.page_size} total={data.total} params={{ year: year ? String(year) : undefined }} />
                </>
              )}
            </div>
          </section>
        </>
      )}

      {submit.open && (
        <InviteBand id="kp-cta-h" title="अगले अंक में आपकी रचना?" text="अपनी मौलिक रचना भेजिए; संपादकीय समीक्षा के बाद चुनी हुई रचनाएँ प्रकाशित होती हैं।">
          <Link className="cta-btn cta-light" href="/rachna-bhejein"><SendIcon /> अपनी रचना भेजें</Link>
        </InviteBand>
      )}
    </>
  );
}
