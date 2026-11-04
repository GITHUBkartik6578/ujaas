import type { Metadata } from 'next';
import Link from 'next/link';
import { api, ApiError, type AuthorCard, type Card, type Paged } from '@/lib/api';
import { formatDate, TYPE_LABEL, typeLabel, typeLetter } from '@/lib/format';
import { AuthorLinks, Pagination } from '@/components/parts';
import { GENRES } from '@/components/home/LiteraryCategories';
import { ABOUT } from '@/content/pages';
import { dev, EmptyBox, SearchIcon, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = { title: 'खोज', robots: { index: false, follow: true } };
const PAGE_SIZE = 12;

/** Wraps the first match of the query in <mark>; text only, nothing is parsed as HTML. */
function Hit({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string; type?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const type = sp.type && sp.type in TYPE_LABEL ? sp.type : undefined;

  let result: (Paged<Card> & { q: string }) | null = null;
  let failure: 'rate' | 'down' | null = null;
  let writers: AuthorCard[] = [];
  if (q) {
    const qs = new URLSearchParams({ q, page: String(page), page_size: String(PAGE_SIZE), ...(type ? { type } : {}) });
    try {
      result = await api<Paged<Card> & { q: string }>(`/search?${qs}`);
    } catch (err) {
      failure = err instanceof ApiError && err.status === 429 ? 'rate' : 'down';
    }
    // Writers whose name begins with the query (the directory matches the start of a name).
    if (!failure && [...q].length <= 12) {
      writers = (await api<Paged<AuthorCard>>(`/authors?${new URLSearchParams({ startswith: q, page_size: '4' })}`).catch(() => null))?.items ?? [];
    }
  }
  const retry = `/khoj?${new URLSearchParams({ q, ...(type ? { type } : {}), ...(page > 1 ? { page: String(page) } : {}) })}`;
  const typeHref = (k?: string) => `/khoj?${new URLSearchParams({ q, ...(k ? { type: k } : {}) })}`;

  return (
    <>
      <PageHero
        art="search" id="kj-h1" size="xl" title="खोज" eyebrow="शब्द से रचना तक"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'खोज' }]}
        lead="रचना का शीर्षक, कोई पंक्ति, रचनाकार का नाम या विषय लिखिए — उजास का साहित्य आपके सामने होगा।"
      >
        <form className="pg-searchbar" action="/khoj" method="get" role="search">
          <label htmlFor="q" className="visually-hidden">रचना, रचनाकार या विषय खोजें</label>
          <SearchIcon />
          <input id="q" name="q" type="search" defaultValue={q} maxLength={100} required placeholder="रचना, पंक्ति, रचनाकार या विषय" />
          {type && <input type="hidden" name="type" value={type} />}
          <button type="submit" className="cta-btn cta-primary">खोजें</button>
        </form>
      </PageHero>
      <GoldBand />

      <section className="pg-sec-tight" aria-labelledby="kj-res-h">
        <div className="pg-wrap">
          {!q && (
            <>
              <SectionHead kicker="खोजना शुरू कीजिए" title="या विधा के अनुसार देखिए" id="kj-res-h" />
              <div className="pg-grid cols-4">
                {ABOUT.genres.map((g) => (
                  <Link key={g.label} className="pg-card ab-genre" href={GENRES.find((x) => x.label === g.label)?.href ?? '/sahitya'}>
                    <span className="pg-letter pg-letter-wine" aria-hidden="true">{g.letter}</span>
                    <span><span className="ab-genre-name">{g.label}</span><span className="ab-genre-note">{g.note}</span></span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {failure && (
            <EmptyBox title={failure === 'rate' ? 'बहुत अधिक खोज अनुरोध' : 'खोज अभी उपलब्ध नहीं है'} mark={<SearchIcon size={32} />}>
              <p>{failure === 'rate' ? 'कृपया कुछ देर बाद फिर से प्रयास करें।' : 'सेवा से संपर्क नहीं हो सका।'}</p>
              <div className="cta-row"><Link className="cta-btn cta-primary" href={retry}>फिर से प्रयास करें</Link></div>
            </EmptyBox>
          )}

          {result && (
            <>
              <div className="pg-listhead">
                <div>
                  <p className="pg-kick-line">खोज परिणाम</p>
                  <h2 id="kj-res-h" className="pg-h2" role="status">“{q}” के लिए {dev(result.total)} परिणाम</h2>
                </div>
                <nav className="pg-chips" aria-label="विधा">
                  <Link className="pg-chip" href={typeHref()} aria-current={!type ? 'page' : undefined}>सभी</Link>
                  {Object.entries(TYPE_LABEL).map(([k, label]) => (
                    <Link key={k} className="pg-chip" href={typeHref(k)} aria-current={type === k ? 'page' : undefined}>{label}</Link>
                  ))}
                </nav>
              </div>

              {result.items.length === 0 ? (
                <EmptyBox title={`“${q}” से कोई रचना नहीं मिली`} mark={<SearchIcon size={32} />}>
                  <p>दूसरा शब्द आज़माइए, वर्तनी जाँचिए, या इन्हें देखिए।</p>
                  <div className="pg-chips">
                    <Link className="pg-chip" href="/sahitya">साहित्य</Link>
                    <Link className="pg-chip" href="/rachnakar">रचनाकार</Link>
                    <Link className="pg-chip" href="/sangrah">संग्रह</Link>
                  </div>
                </EmptyBox>
              ) : (
                <div className="kj-layout">
                  <div>
                    <ol className="kj-results">
                      {result.items.map((r) => (
                        <li key={r.slug} className="pg-card kj-row">
                          <span className="pg-medal kj-mark" aria-hidden="true">{typeLetter(r.type)}</span>
                          <div>
                            <p className="kj-meta">
                              <span className="pg-tag">{typeLabel(r.type)}</span>
                              {r.authors.length > 0 && <span><AuthorLinks authors={r.authors} /></span>}
                              {r.published_at && <span>{formatDate(r.published_at)}</span>}
                            </p>
                            <h3><Link href={`/rachna/${r.slug}`}><Hit text={r.title} q={q} /></Link></h3>
                            <p className="kj-excerpt"><Hit text={r.excerpt} q={q} /></p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <Pagination basePath="/khoj" page={result.page} pageSize={result.page_size} total={result.total} params={{ q, type }} />
                  </div>
                  <aside className="kj-side">
                    <div className="pg-panel kj-writers">
                      <h3>मिलते-जुलते रचनाकार</h3>
                      {writers.length > 0 ? (
                        <ul>
                          {writers.map((w) => (
                            <li key={w.slug}><Link href={`/rachnakar/${w.slug}`}><span className="kj-initial" aria-hidden="true">{[...w.name][0]}</span>{w.name}</Link></li>
                          ))}
                        </ul>
                      ) : (
                        <p>इस खोज से जुड़ा कोई रचनाकार नहीं।</p>
                      )}
                    </div>
                    <p className="pg-note"><span><strong>खोज के सुझाव:</strong> पूरे शब्द लिखिए, मात्राएँ जाँचिए, या विधा का फ़िल्टर हटाकर फिर देखिए।</span></p>
                  </aside>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
