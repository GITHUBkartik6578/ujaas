import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiOrNull, type Card } from '@/lib/api';
import { typeLabel } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { AuthorLinks } from '@/components/parts';
import { dev, EmptyBox, InviteBand } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

interface Col { slug: string; title: string; description: string | null; items: Card[] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await apiOrNull<Col>(`/collections/${encodeURIComponent(slug)}`);
  if (!c) return { title: 'पृष्ठ नहीं मिला' };
  return { title: c.title, description: c.description ?? undefined, alternates: { canonical: absUrl(`/sangrah/${c.slug}`) } };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await apiOrNull<Col>(`/collections/${encodeURIComponent(slug)}`);
  if (!c) notFound();
  const count = `${dev(c.items.length)} रचनाएँ`;
  return (
    <>
      <PageHero
        art="collections" id="sg-h1" size="sm" title={c.title} eyebrow="संग्रह" tagline="एक धागे में पिरोई रचनाएँ"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'संग्रह', href: '/sangrah' }, { label: c.title }]}
        lead={c.description ?? undefined} meta={[count]}
      />
      <GoldBand />

      <section className="pg-sec" aria-labelledby="sg-d-h">
        <div className="pg-wrap sg-detail">
          <aside className="sg-book sg-book-static" aria-hidden="true">
            <span className="sg-spine" />
            <span className="sg-cover"><span className="sg-title">{c.title}</span><span className="sg-count">{count}</span></span>
          </aside>
          <div>
            <p className="pg-kick-line">संग्रह</p>
            <h2 id="sg-d-h" className="pg-h2">इस संग्रह में</h2>
            {c.items.length === 0 ? (
              <EmptyBox title="इस संग्रह में अभी कोई रचना नहीं है">
                <div className="cta-row"><Link className="cta-btn cta-outline" href="/sangrah">सभी संग्रह</Link></div>
              </EmptyBox>
            ) : (
              <ol className="pg-card ct-index sg-items">
                {c.items.map((it, i) => (
                  <li key={it.slug}>
                    <span className="pg-medal pg-medal-sm" aria-hidden="true">{dev(i + 1)}</span>
                    <div>
                      <p className="ct-index-meta"><span className="pg-tag">{typeLabel(it.type)}</span>{it.authors.length > 0 && <span className="ct-index-author"><AuthorLinks authors={it.authors} /></span>}</p>
                      <h3><Link href={`/rachna/${it.slug}`}>{it.title}</Link></h3>
                      <p className="ct-index-excerpt">{it.excerpt}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="section-more sg-back"><Link href="/sangrah">‹ सभी संग्रह</Link></p>
          </div>
        </div>
      </section>

      <InviteBand id="sg-join" title="पूरा साहित्य-संसार देखिए" text="विधा के अनुसार सभी प्रकाशित रचनाएँ पढ़िए, या ई-पत्रिका के अंकों में संपादकीय क्रम से।">
        <Link className="cta-btn cta-light" href="/sahitya">साहित्य देखें</Link>
        <Link className="cta-btn cta-gold" href="/e-patrika">ई-पत्रिका</Link>
      </InviteBand>
    </>
  );
}
