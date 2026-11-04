import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, apiOrNull, type AuthorCard, type Card, type Paged } from '@/lib/api';
import { typeLabel } from '@/lib/format';
import { absUrl, jsonLd } from '@/lib/site';
import { CardGrid, Pagination, Picture } from '@/components/parts';
import { Arrow } from '@/components/home/Ornament';
import { dev, EmptyBox, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await apiOrNull<AuthorCard>(`/authors/${encodeURIComponent(slug)}`);
  if (!a) return { title: 'पृष्ठ नहीं मिला' };
  return {
    title: a.name,
    description: a.bio ?? `${a.name} की रचनाएँ उजास पर।`,
    alternates: { canonical: absUrl(`/rachnakar/${a.slug}`) },
  };
}

export default async function AuthorPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const a = await apiOrNull<AuthorCard>(`/authors/${encodeURIComponent(slug)}`);
  if (!a) notFound(); // a non-public author is indistinguishable from a missing one
  const [works, others] = await Promise.all([
    api<Paged<Card>>(`/authors/${encodeURIComponent(slug)}/contents?page=${page}&page_size=${PAGE_SIZE}`),
    api<Paged<AuthorCard>>('/authors?page=1&page_size=5').catch(() => null),
  ]);
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: a.name, url: absUrl(`/rachnakar/${a.slug}`), ...(a.bio ? { description: a.bio } : {}) };
  const types = [...new Set(works.items.map((w) => typeLabel(w.type)))];
  const first = works.items[0];
  const countLabel = `${dev(works.total)} रचनाएँ`;
  const initial = [...a.name][0];
  const rest = (others?.items ?? []).filter((o) => o.slug !== a.slug).slice(0, 4);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <PageHero
        art="profile" artVars={{ 'work0.initial': initial }} id="wp-h1" size="sm" title={a.name} eyebrow="रचनाकार परिचय"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'रचनाकार', href: '/rachnakar' }, { label: a.name }]}
        lead={a.bio ?? undefined}
      >
        {types.length > 0 && <p className="wp-tags">{types.map((t) => <span key={t} className="pg-tag">{t}</span>)}</p>}
        {works.total > 0 && <div className="ph-ctas"><a className="cta-btn cta-primary" href="#wp-works">{countLabel} पढ़ें <Arrow /></a></div>}
      </PageHero>
      <GoldBand />

      <section className="pg-sec" aria-labelledby="wp-about">
        <div className="pg-wrap wp-about">
          <aside className="pg-card wp-facts" aria-label="संक्षिप्त जानकारी">
            {a.photo ? (
              <figure className="wp-photo">
                <Picture cover={a.photo} sizes="10rem" />
                {a.photo.credit && <figcaption>{a.photo.credit}</figcaption>}
              </figure>
            ) : (
              <span className="pg-medal wp-initial" aria-hidden="true">{initial}</span>
            )}
            <p className="wp-name">{a.name}</p>
            <dl>
              {a.birth_year && <div><dt>जन्म वर्ष</dt><dd>{a.birth_year}</dd></div>}
              {a.birthplace && <div><dt>जन्म स्थान</dt><dd>{a.birthplace}</dd></div>}
              {types.length > 0 && <div><dt>विधाएँ</dt><dd>{types.join(', ')}</dd></div>}
              <div><dt>रचनाएँ</dt><dd>{countLabel}</dd></div>
            </dl>
          </aside>
          <article className="wp-bio">
            <h2 id="wp-about" className="pg-h2">परिचय</h2>
            <p>{a.bio ?? 'इस रचनाकार का परिचय अभी उपलब्ध नहीं है।'}</p>
          </article>
          {first && (
            <figure className="pg-panel wp-quote">
              <blockquote>{first.excerpt}</blockquote>
              <figcaption>— <Link href={`/rachna/${first.slug}`}>“{first.title}”</Link> से</figcaption>
            </figure>
          )}
        </div>
      </section>

      <section id="wp-works" className="pg-sec pg-tint" aria-labelledby="wp-works-h">
        <div className="pg-wrap">
          <SectionHead kicker={countLabel} title={`${a.name} की रचनाएँ`} id="wp-works-h" />
          {works.items.length === 0 ? (
            <EmptyBox title="अभी कोई प्रकाशित रचना नहीं है" />
          ) : (
            <>
              <CardGrid items={works.items} level={3} />
              <Pagination basePath={`/rachnakar/${a.slug}`} page={works.page} pageSize={works.page_size} total={works.total} />
            </>
          )}
        </div>
      </section>

      {rest.length > 0 && (
        <section className="pg-sec" aria-labelledby="wp-others">
          <div className="pg-wrap">
            <SectionHead kicker="रचनाकारों की छाँव से" title="अन्य रचनाकार" id="wp-others" />
            <ul className="pg-grid cols-4">
              {rest.map((o) => (
                <li key={o.slug}>
                  <Link className="pg-card wp-other" href={`/rachnakar/${o.slug}`}>
                    <span className="pg-medal pg-medal-sm" aria-hidden="true">{[...o.name][0]}</span>
                    <span><span className="wp-other-name">{o.name}</span>{o.works_count !== undefined && <span className="wp-other-meta">{dev(o.works_count)} रचनाएँ</span>}</span>
                    <span aria-hidden="true" className="wp-other-arrow">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="section-more"><Link href="/rachnakar">सभी रचनाकार देखें <Arrow /></Link></p>
          </div>
        </section>
      )}
    </>
  );
}
