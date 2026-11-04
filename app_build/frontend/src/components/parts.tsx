import Image from 'next/image';
import Link from 'next/link';
import type { AuthorCard, AuthorRef, Card, Cover } from '@/lib/api';
import { formatDate, typeLabel, typeLetter } from '@/lib/format';

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="breadcrumbs" aria-label="पथ">
      <ol>
        {items.map((it, i) => (
          <li key={i}>
            {it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** `priority` is for a picture in the first screen: it loads at once and is never lazy (it is often the largest paint). */
export function Picture({ cover, sizes, priority = false }: { cover: Cover; sizes?: string; priority?: boolean }) {
  return (
    <Image
      src={cover.url} alt={cover.alt} width={cover.width} height={cover.height} sizes={sizes} unoptimized
      {...(priority ? { priority: true, fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
    />
  );
}

export function AuthorLinks({ authors }: { authors: AuthorRef[] }) {
  return (
    <>
      {authors.map((a, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {a.slug ? <Link href={`/rachnakar/${a.slug}`}>{a.name}</Link> : a.name}
        </span>
      ))}
    </>
  );
}

/** Literature card (approved canvas): wine top band with the type mark and date, title, excerpt, author and a read link. */
export function ContentCard({ c, priority = false, level = 2 }: { c: Card; priority?: boolean; level?: 2 | 3 }) {
  const date = formatDate(c.published_at);
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <article className="wk">
      <div className="wk-band">
        <span className="wk-type"><span className="wk-mark" aria-hidden="true">{typeLetter(c.type)}</span>{typeLabel(c.type)}</span>
        {date && <span className="wk-date">{date}</span>}
      </div>
      {c.cover && (
        <div className="wk-cover">
          <Picture cover={c.cover} sizes="(min-width: 900px) 30vw, 90vw" priority={priority} />
        </div>
      )}
      <div className="wk-body">
        <Heading className="wk-title"><Link href={`/rachna/${c.slug}`}>{c.title}</Link></Heading>
        <p className="wk-excerpt">{c.excerpt}</p>
        <div className="wk-foot">
          {c.authors.length > 0 && <span className="wk-author"><AuthorLinks authors={c.authors} /></span>}
          <Link className="wk-read" href={`/rachna/${c.slug}`} aria-label={`${c.title} पढ़ें`}>पढ़ें <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </article>
  );
}

export function CardGrid({ items, level = 2 }: { items: Card[]; level?: 2 | 3 }) {
  return (
    <ul className="wk-grid">
      {items.map((c, i) => (
        <li key={c.slug}><ContentCard c={c} level={level} priority={i < 3} /></li>
      ))}
    </ul>
  );
}

/** Writer card: round initial (or photo), name, short bio, works count and the profile link. */
export function AuthorTile({ a }: { a: AuthorCard }) {
  return (
    <li>
      <article className="pg-card wr">
        {a.photo ? (
          <span className="wr-photo"><Picture cover={a.photo} sizes="96px" /></span>
        ) : (
          <span className="pg-medal wr-initial" aria-hidden="true">{[...a.name][0]}</span>
        )}
        <h3 className="wr-name"><Link href={`/rachnakar/${a.slug}`}>{a.name}</Link></h3>
        {a.bio && <p className="wr-bio">{a.bio}</p>}
        {a.works_count !== undefined && <p className="wr-count"><strong>{a.works_count}</strong> रचनाएँ</p>}
        <Link className="wr-link" href={`/rachnakar/${a.slug}`} aria-label={`${a.name} की प्रोफ़ाइल`}>प्रोफ़ाइल देखें <span aria-hidden="true">→</span></Link>
      </article>
    </li>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="pg-empty" role="status">
      <h2 className="pg-empty-title">{title}</h2>
      {children}
    </div>
  );
}

/** Real links to real pages; the current page is not a link. Stable URLs: ?page=N plus the other filters. */
export function Pagination({
  basePath, page, pageSize, total, params = {},
}: { basePath: string; page: number; pageSize: number; total: number; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2);
  return (
    <nav className="pg-pages" aria-label="पृष्ठ">
      {page > 1 && <Link href={href(page - 1)} rel="prev">‹ पिछला</Link>}
      <ol>
        {nums.map((p, i) => (
          <li key={p}>
            {i > 0 && p - (nums[i - 1] ?? 0) > 1 && <span className="gap" aria-hidden="true">…</span>}
            {p === page ? <span aria-current="page">{p}</span> : <Link href={href(p)}>{p}</Link>}
          </li>
        ))}
      </ol>
      {page < pages && <Link href={href(page + 1)} rel="next">अगला ›</Link>}
    </nav>
  );
}

/** Verse keeps every line break; prose is paragraphs. Text only: nothing is injected as HTML. */
export function Body({ body, format }: { body: string; format: 'verse' | 'prose' }) {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (format === 'verse') {
    return (
      <div className="body verse">
        {blocks.map((stanza, i) => (
          <p key={i}>
            {stanza.split('\n').map((line, j) => (
              <span key={j}>
                {line}
                <br />
              </span>
            ))}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className="body prose">
      {blocks.map((p, i) => (
        <p key={i}>{p.replace(/\n/g, ' ')}</p>
      ))}
    </div>
  );
}
