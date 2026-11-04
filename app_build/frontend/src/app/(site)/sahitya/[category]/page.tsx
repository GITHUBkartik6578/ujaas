import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, apiOrNull, type Card, type CategoryRow, type Paged } from '@/lib/api';
import { formatDate, typeLabel } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { ABOUT } from '@/content/pages';
import { AuthorLinks, Pagination } from '@/components/parts';
import { Arrow, PenIcon } from '@/components/home/Ornament';
import { dev, EmptyBox, InviteBand, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

interface Cat { slug: string; name: string; description: string | null; works_count: number }
const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = await apiOrNull<Cat>(`/categories/${encodeURIComponent(category)}`);
  if (!c) return { title: 'पृष्ठ नहीं मिला' };
  return {
    title: c.name,
    description: c.description ?? `उजास पर ${c.name} श्रेणी की रचनाएँ।`,
    alternates: { canonical: absUrl(`/sahitya/${c.slug}`) },
  };
}

export default async function CategoryPage({
  params, searchParams,
}: { params: Promise<{ category: string }>; searchParams: Promise<{ page?: string }> }) {
  const { category } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const c = await apiOrNull<Cat>(`/categories/${encodeURIComponent(category)}`);
  if (!c) notFound();
  const [list, cats, submit] = await Promise.all([
    api<Paged<Card>>(`/categories/${encodeURIComponent(category)}/contents?page=${page}&page_size=${PAGE_SIZE}`),
    api<{ items: CategoryRow[] }>('/categories'),
    getSubmissionConfig(),
  ]);
  const note = ABOUT.genres.find((g) => g.label === c.name)?.note;
  const featured = page === 1 ? list.items[0] : undefined;
  return (
    <>
      <PageHero
        art="category" id="ct-h1" size="md" title={c.name} eyebrow="साहित्यिक श्रेणी" tagline={note}
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'साहित्य', href: '/sahitya' }, { label: c.name }]}
        lead={c.description ?? `उजास पर प्रकाशित ${c.name} श्रेणी की रचनाएँ।`}
      >
        <div className="ph-ctas ct-count">
          <span className="ct-badge"><strong>{dev(c.works_count)}</strong> प्रकाशित रचनाएँ</span>
          {list.items.length > 0 && <a className="cta-btn cta-primary" href="#ct-works">पढ़ना शुरू करें <Arrow /></a>}
        </div>
      </PageHero>
      <GoldBand />

      <section className="ct-switch" aria-labelledby="ct-switch-h">
        <div className="pg-wrap pg-chips">
          <h2 id="ct-switch-h" className="pg-chips-label">श्रेणियाँ:</h2>
          {cats.items.map((k) => (
            <Link key={k.slug} className="pg-chip" href={`/sahitya/${k.slug}`} aria-current={k.slug === c.slug ? 'page' : undefined}>
              {k.name} <small>({dev(k.works_count)})</small>
            </Link>
          ))}
        </div>
      </section>

      {featured && (
        <section className="pg-sec-tight" aria-labelledby="ct-feature-h">
          <div className="pg-wrap">
            <article className="ct-feature">
              <div className="pg-panel ct-feature-side">
                <p className="pg-kick-line ct-feature-kick">इस श्रेणी की विशेष रचना</p>
                <h2 id="ct-feature-h">{featured.title}</h2>
                <p className="ct-feature-by">
                  {featured.authors.length > 0 && <><AuthorLinks authors={featured.authors} /> · </>}{typeLabel(featured.type)}
                  {featured.published_at && <> · {formatDate(featured.published_at)}</>}
                </p>
                <Link className="cta-btn cta-gold" href={`/rachna/${featured.slug}`}>पूरी रचना पढ़ें <Arrow /></Link>
              </div>
              <div className="pg-sheet ct-feature-text"><p>{featured.excerpt}</p></div>
            </article>
          </div>
        </section>
      )}

      <section id="ct-works" className="pg-sec pg-tint" aria-labelledby="ct-works-h">
        <div className="pg-wrap pg-narrow">
          <SectionHead kicker={`${c.name} श्रेणी`} title="अनुक्रमणिका" id="ct-works-h" />
          {list.items.length === 0 ? (
            <EmptyBox title="इस श्रेणी में अभी कोई रचना नहीं है">
              <p>सभी साहित्य देखें या खोज आज़माएँ।</p>
              <div className="cta-row"><Link className="cta-btn cta-outline" href="/sahitya">सभी साहित्य</Link><Link className="cta-btn cta-outline" href="/khoj">खोज</Link></div>
            </EmptyBox>
          ) : (
            <>
              <ol className="pg-card ct-index">
                {list.items.map((w, i) => (
                  <li key={w.slug}>
                    <span className="pg-medal pg-medal-sm" aria-hidden="true">{dev((page - 1) * PAGE_SIZE + i + 1)}</span>
                    <div>
                      <div className="ct-index-top">
                        <h3><Link href={`/rachna/${w.slug}`}>{w.title}</Link></h3>
                        {w.authors.length > 0 && <span className="ct-index-author"><AuthorLinks authors={w.authors} /></span>}
                      </div>
                      <p className="ct-index-excerpt">{w.excerpt}</p>
                      <p className="ct-index-meta">
                        <span className="pg-tag">{typeLabel(w.type)}</span>
                        {w.published_at && <span>{formatDate(w.published_at)}</span>}
                        <Link href={`/rachna/${w.slug}`} aria-label={`${w.title} पढ़ें`}>पढ़ें →</Link>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <Pagination basePath={`/sahitya/${c.slug}`} page={list.page} pageSize={list.page_size} total={list.total} />
            </>
          )}
          <p className="section-more"><Link href="/sahitya">सारा साहित्य देखें <Arrow /></Link></p>
        </div>
      </section>

      {submit.open && (
        <InviteBand id="ct-join" title={`आपके पास भी ${c.name} की कोई रचना है?`} text="अपनी मौलिक रचना भेजिए — संपादकीय समीक्षा के बाद वह भी इस श्रेणी की अनुक्रमणिका में जुड़ सकती है।">
          <Link className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> रचना भेजें</Link>
        </InviteBand>
      )}
    </>
  );
}
