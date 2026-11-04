import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type Paged } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { Pagination } from '@/components/parts';
import { dev, EmptyBox, InviteBand, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'संग्रह',
  description: 'उजास के चुने हुए संग्रह।',
  alternates: { canonical: absUrl('/sangrah') },
};
interface Row { slug: string; title: string; description: string | null; works_count: number }
const PAGE_SIZE = 12;

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const list = await api<Paged<Row>>(`/collections?page=${page}&page_size=${PAGE_SIZE}`);
  return (
    <>
      <PageHero
        art="collections" id="sg-h1" title="संग्रह" eyebrow="चुनिंदा रचनाओं के संकलन" tagline="एक धागे में पिरोई रचनाएँ"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'साहित्य', href: '/sahitya' }, { label: 'संग्रह' }]}
        lead="विषय, ऋतु या भाव के आधार पर संपादकीय टीम द्वारा चुनी गई रचनाओं के संकलन — एक साथ, एक क्रम में पढ़िए।"
      />
      <GoldBand />

      <section className="pg-sec" aria-labelledby="sg-list-h">
        <div className="pg-wrap">
          <SectionHead kicker="संपादकीय संकलन" title="सभी संग्रह" id="sg-list-h" />
          {list.items.length === 0 ? (
            <EmptyBox title="अभी कोई संग्रह प्रकाशित नहीं है">
              <p>तब तक विधा के अनुसार सारा साहित्य पढ़िए।</p>
              <div className="cta-row"><Link className="cta-btn cta-outline" href="/sahitya">साहित्य देखें</Link></div>
            </EmptyBox>
          ) : (
            <>
              <ul className="pg-grid cols-3">
                {list.items.map((c) => (
                  <li key={c.slug}>
                    <Link className="sg-book" href={`/sangrah/${c.slug}`}>
                      <span className="sg-spine" aria-hidden="true" />
                      <span className="sg-cover">
                        <span className="sg-title">{c.title}</span>
                        <span className="sg-count">{dev(c.works_count)} रचनाएँ</span>
                      </span>
                      {c.description && <span className="sg-desc">{c.description}</span>}
                      <span className="sg-open">संग्रह खोलें <span aria-hidden="true">→</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination basePath="/sangrah" page={list.page} pageSize={list.page_size} total={list.total} />
            </>
          )}
        </div>
      </section>

      <InviteBand id="sg-join" title="पूरा साहित्य-संसार देखिए" text="विधा के अनुसार सभी प्रकाशित रचनाएँ पढ़िए, या ई-पत्रिका के अंकों में संपादकीय क्रम से।">
        <Link className="cta-btn cta-light" href="/sahitya">साहित्य देखें</Link>
        <Link className="cta-btn cta-gold" href="/e-patrika">ई-पत्रिका</Link>
      </InviteBand>
    </>
  );
}
