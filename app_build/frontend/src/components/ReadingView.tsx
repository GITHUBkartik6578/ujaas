import Link from 'next/link';
import type { Card, Full } from '@/lib/api';
import { formatDate, typeLabel } from '@/lib/format';
import { absUrl, jsonLd } from '@/lib/site';
import { AuthorLinks, Body, Breadcrumbs, Picture } from '@/components/parts';

/** The reading page body, shared by the public address and the signed preview. */
interface IssueNav { issue: { slug: string; title: string }; prev: Card | null; next: Card | null }

export function ReadingView({ c, preview = false, issueNav = null }: { c: Full; preview?: boolean; issueNav?: IssueNav | null }) {
  const date = formatDate(c.published_at);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: c.title, inLanguage: 'hi',
    description: c.excerpt, datePublished: c.published_at ?? undefined,
    author: c.authors.map((a) => ({ '@type': 'Person', name: a.name })),
    mainEntityOfPage: absUrl(`/rachna/${c.slug}`),
    ...(c.cover ? { image: absUrl(c.cover.url) } : {}),
  };
  return (
    <article className="frame page reading">
      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />}
      {preview && (
        <p className="preview-banner" role="note">
          पूर्वावलोकन: यह रचना अभी प्रकाशित नहीं है। यह लिंक कुछ समय बाद काम करना बंद कर देगा।
        </p>
      )}
      <Breadcrumbs
        items={[
          { label: 'मुख्य पृष्ठ', href: '/' },
          { label: 'साहित्य', href: '/sahitya' },
          ...(c.category ? [{ label: c.category.name, href: preview ? undefined : `/sahitya/${c.category.slug}` }] : []),
          { label: c.title },
        ]}
      />
      {issueNav && (
        <nav className="issue-nav" aria-label="अंक में">
          <p>
            अंक: <Link href={`/e-patrika/${issueNav.issue.slug}`}>{issueNav.issue.title}</Link>
          </p>
          <p className="issue-nav-links">
            {issueNav.prev && <Link href={`/rachna/${issueNav.prev.slug}?issue=${encodeURIComponent(issueNav.issue.slug)}`} rel="prev">← {issueNav.prev.title}</Link>}
            {issueNav.next && <Link href={`/rachna/${issueNav.next.slug}?issue=${encodeURIComponent(issueNav.issue.slug)}`} rel="next">{issueNav.next.title} →</Link>}
          </p>
        </nav>
      )}
      <div className="reading-grid">
        <div>
          <header>
            <h1>{c.title}</h1>
            <p className="by">
              <AuthorLinks authors={c.authors} />
            </p>
          </header>
          <Body body={c.body} format={c.body_format} />
        </div>
        <aside className="reading-aside" aria-label="रचना का विवरण">
          {c.cover && (
            <figure className="cover">
              <Picture cover={c.cover} sizes="(min-width: 900px) 24rem, 100vw" priority />
              {c.cover.credit && <figcaption>{c.cover.credit}</figcaption>}
            </figure>
          )}
          <dl className="facts">
            <div>
              <dt>प्रकार</dt>
              <dd>{typeLabel(c.type)}</dd>
            </div>
            {c.category && (
              <div>
                <dt>श्रेणी</dt>
                <dd>{preview ? c.category.name : <Link href={`/sahitya/${c.category.slug}`}>{c.category.name}</Link>}</dd>
              </div>
            )}
            {c.authors.length > 0 && (
              <div>
                <dt>रचनाकार</dt>
                <dd><AuthorLinks authors={c.authors} /></dd>
              </div>
            )}
            {date && (
              <div>
                <dt>प्रकाशित</dt>
                <dd>{date}</dd>
              </div>
            )}
            {c.source_note && (
              <div>
                <dt>स्रोत</dt>
                <dd>{c.source_note}</dd>
              </div>
            )}
            {c.translator_note && (
              <div>
                <dt>अनुवाद</dt>
                <dd>{c.translator_note}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </article>
  );
}
