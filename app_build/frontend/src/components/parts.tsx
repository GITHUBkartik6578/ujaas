import Image from 'next/image';
import Link from 'next/link';
import type { AuthorCard, AuthorRef, Card, Cover } from '@/lib/api';
import { formatDate, typeLabel } from '@/lib/format';

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

export function ContentCard({ c, priority = false, level = 2 }: { c: Card; priority?: boolean; level?: 2 | 3 }) {
  const date = formatDate(c.published_at);
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <article className="card">
      {c.cover && (
        <div className="card-cover">
          <Picture cover={c.cover} sizes="(min-width: 900px) 30vw, 90vw" priority={priority} />
        </div>
      )}
      <Heading className="card-title">
        <Link href={`/rachna/${c.slug}`}>{c.title}</Link>
      </Heading>
      <p className="card-meta">
        {typeLabel(c.type)}
        {c.authors.length > 0 && <> · <AuthorLinks authors={c.authors} /></>}
        {date && <> · {date}</>}
      </p>
      <p className="card-excerpt">{c.excerpt}</p>
    </article>
  );
}

export function CardGrid({ items, level = 2 }: { items: Card[]; level?: 2 | 3 }) {
  return (
    <div className="card-grid">
      {items.map((c, i) => (
        <ContentCard key={c.slug} c={c} level={level} priority={i < 3} />
      ))}
    </div>
  );
}

export function AuthorTile({ a }: { a: AuthorCard }) {
  return (
    <li className="author-tile">
      <Link href={`/rachnakar/${a.slug}`}>
        <span className="author-name">{a.name}</span>
        {a.works_count !== undefined && <span className="author-role">{a.works_count} रचनाएँ</span>}
      </Link>
    </li>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty" role="status">
      <h2>{title}</h2>
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
    <nav className="pagination" aria-label="पृष्ठ">
      {page > 1 && <Link href={href(page - 1)} rel="prev">पिछला</Link>}
      <ol>
        {nums.map((p, i) => (
          <li key={p}>
            {i > 0 && p - (nums[i - 1] ?? 0) > 1 && <span aria-hidden="true">…</span>}
            {p === page ? <span aria-current="page">{p}</span> : <Link href={href(p)}>{p}</Link>}
          </li>
        ))}
      </ol>
      {page < pages && <Link href={href(page + 1)} rel="next">अगला</Link>}
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
