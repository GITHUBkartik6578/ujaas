import Link from 'next/link';
import { api, apiOrNull, type AuthorCard, type Card, type Full, type Paged } from '@/lib/api';
import { formatDate, typeLabel, typeLetter } from '@/lib/format';
import { absUrl, jsonLd } from '@/lib/site';
import { AuthorLinks, Body, Picture } from '@/components/parts';
import { Arrow } from '@/components/home/Ornament';
import { dev, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';
import { ReadingSheet, ShareTools } from './ReadingTools';

/** The reading page body, shared by the public address and the signed preview. */
interface IssueNav { issue: { slug: string; title: string }; prev: Card | null; next: Card | null }

const minutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 180));

export async function ReadingView({ c, preview = false, issueNav = null }: { c: Full; preview?: boolean; issueNav?: IssueNav | null }) {
  const date = formatDate(c.published_at);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: c.title, inLanguage: 'hi',
    description: c.excerpt, datePublished: c.published_at ?? undefined,
    author: c.authors.map((a) => ({ '@type': 'Person', name: a.name })),
    mainEntityOfPage: absUrl(`/rachna/${c.slug}`),
    ...(c.cover ? { image: absUrl(c.cover.url) } : {}),
  };
  const lead = c.authors.find((a) => a.slug);
  const [author, related] = await Promise.all([
    lead?.slug ? apiOrNull<AuthorCard>(`/authors/${encodeURIComponent(lead.slug)}`).catch(() => null) : null,
    c.category && !preview
      ? api<Paged<Card>>(`/categories/${encodeURIComponent(c.category.slug)}/contents?page=1&page_size=4`).then((r) => r.items.filter((x) => x.slug !== c.slug).slice(0, 3)).catch(() => [])
      : [],
  ]);
  const names = c.authors.map((a) => a.name).join(', ');
  const read = `${dev(minutes(c.body))} मिनट`;
  return (
    <article className="reading">
      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />}
      {preview && (
        <div className="pv-band" role="note">
          <div className="pg-wrap pv-band-row">
            <span className="pv-pill" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path className="pv-eye" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
              पूर्वावलोकन
            </span>
            <p>पूर्वावलोकन: यह रचना अभी प्रकाशित नहीं है। यह लिंक कुछ समय बाद काम करना बंद कर देगा।</p>
          </div>
        </div>
      )}
      <div className="rd-hero">
        {preview && <div className="pv-ribbon" aria-hidden="true"><span>अप्रकाशित</span></div>}
        <PageHero
          art="reading" id="rd-h1" size="sm" title={c.title}
          badge={<p className="rd-type"><span className="rd-type-mark" aria-hidden="true">{typeLetter(c.type)}</span>{typeLabel(c.type)}</p>}
          crumbs={[
            { label: 'मुख्य पृष्ठ', href: '/' },
            { label: 'साहित्य', href: '/sahitya' },
            ...(c.category ? [{ label: c.category.name, href: preview ? undefined : `/sahitya/${c.category.slug}` }] : []),
            { label: c.title },
          ]}
        >
          {c.authors.length > 0 && (
            <p className="rd-by">
              <span className="rd-by-mark" aria-hidden="true">{[...c.authors[0]!.name][0]}</span>
              <span><strong><AuthorLinks authors={c.authors} /></strong><span>{date ? `${date} · ` : ''}पढ़ने का समय: {read}</span></span>
            </p>
          )}
          <div className="ph-ctas"><a className="cta-btn cta-primary" href="#rd-read">रचना पढ़ें <Arrow /></a></div>
        </PageHero>
      </div>
      <GoldBand />

      {issueNav && (
        <nav className="pg-wrap pg-text rd-issue" aria-label="अंक में">
          <p>अंक: <Link href={`/e-patrika/${issueNav.issue.slug}`}>{issueNav.issue.title}</Link></p>
        </nav>
      )}

      <section id="rd-read" className="rd-read" aria-label="रचना">
        <div className="pg-wrap pg-text">
          <ReadingSheet verse={c.body_format === 'verse'}>
            {c.cover && (
              <figure className="rd-cover">
                <Picture cover={c.cover} sizes="(min-width: 900px) 44rem, 100vw" priority />
                {c.cover.credit && <figcaption>{c.cover.credit}</figcaption>}
              </figure>
            )}
            <svg className="ornament rd-orn" width="300" height="22" viewBox="0 0 300 22" aria-hidden="true">
              <line x1="0" y1="11" x2="126" y2="11" className="ornament-line" /><line x1="174" y1="11" x2="300" y2="11" className="ornament-line" />
              <g className="ornament-fill"><path d="M150 0 Q154 8 150 11 Q146 8 150 0Z" /><path d="M150 22 Q154 14 150 11 Q146 14 150 22Z" /><path d="M139 11 Q147 7 150 11 Q147 15 139 11Z" /><path d="M161 11 Q153 7 150 11 Q153 15 161 11Z" /></g>
            </svg>
            <h2 className="rd-title">{c.title}</h2>
            <Body body={c.body} format={c.body_format} />
            <svg className="rd-end" width="120" height="20" viewBox="0 0 120 20" aria-hidden="true"><g className="ornament-fill"><path d="M60 2 L67 10 L60 18 L53 10Z" /><circle cx="38" cy="10" r="3" /><circle cx="82" cy="10" r="3" /><circle cx="22" cy="10" r="2" /><circle cx="98" cy="10" r="2" /></g></svg>
            {names && <p className="rd-sign">— {names}</p>}
          </ReadingSheet>

          {(c.source_note || c.translator_note) && (
            <div className="pg-note rd-notes">
              <span>
                {c.source_note && <><strong>स्रोत:</strong> {c.source_note}</>}
                {c.source_note && c.translator_note && <br />}
                {c.translator_note && <><strong>अनुवाद:</strong> {c.translator_note}</>}
              </span>
            </div>
          )}

          {!preview && <ShareTools url={absUrl(`/rachna/${c.slug}`)} />}

          {author && (
            <aside className="pg-panel rd-author" aria-label="रचनाकार">
              {author.photo ? (
                <span className="rd-author-photo"><Picture cover={author.photo} sizes="104px" /></span>
              ) : (
                <span className="rd-author-mark" aria-hidden="true">{[...author.name][0]}</span>
              )}
              <div>
                <p className="rd-author-kick">रचनाकार</p>
                <p className="rd-author-name">{author.name}</p>
                {author.bio && <p className="rd-author-bio">{author.bio}</p>}
              </div>
              <Link className="cta-btn cta-gold" href={`/rachnakar/${author.slug}`}>रचनाकार की सभी रचनाएँ <Arrow /></Link>
            </aside>
          )}

          {issueNav && (issueNav.prev || issueNav.next) && (
            <nav className="rd-nav" aria-label="पिछली और अगली रचना">
              {issueNav.prev ? (
                <Link className="pg-card rd-nav-card" href={`/rachna/${issueNav.prev.slug}?issue=${encodeURIComponent(issueNav.issue.slug)}`} rel="prev">
                  <span className="rd-nav-dir">‹ पिछली रचना</span><span className="rd-nav-title">{issueNav.prev.title}</span>
                </Link>
              ) : <span />}
              {issueNav.next && (
                <Link className="pg-card rd-nav-card rd-nav-next" href={`/rachna/${issueNav.next.slug}?issue=${encodeURIComponent(issueNav.issue.slug)}`} rel="next">
                  <span className="rd-nav-dir">अगली रचना ›</span><span className="rd-nav-title">{issueNav.next.title}</span>
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="pg-sec pg-tint" aria-labelledby="rd-rel">
          <div className="pg-wrap">
            <SectionHead kicker="और पढ़िए" title="इसी तरह की रचनाएँ" id="rd-rel" />
            <ul className="pg-grid cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link className="pg-card rd-rel" href={`/rachna/${r.slug}`}>
                    <span className="pg-tag">{typeLabel(r.type)}</span>
                    <span className="rd-rel-title">{r.title}</span>
                    <span className="rd-rel-lines">{r.excerpt}</span>
                    <span className="rd-rel-by">{r.authors.map((a) => a.name).join(', ')} · पढ़ें →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
