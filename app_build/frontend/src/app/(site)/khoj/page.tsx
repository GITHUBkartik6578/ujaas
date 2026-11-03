import type { Metadata } from 'next';
import Link from 'next/link';
import { api, ApiError, type Card, type Paged } from '@/lib/api';
import { TYPE_LABEL } from '@/lib/format';
import { Breadcrumbs, CardGrid, EmptyState, Pagination } from '@/components/parts';

export const metadata: Metadata = { title: 'खोज', robots: { index: false, follow: true } };
const PAGE_SIZE = 12;

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string; type?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const type = sp.type && sp.type in TYPE_LABEL ? sp.type : undefined;

  let result: (Paged<Card> & { q: string }) | null = null;
  let failure: 'rate' | 'down' | null = null;
  if (q) {
    const qs = new URLSearchParams({ q, page: String(page), page_size: String(PAGE_SIZE), ...(type ? { type } : {}) });
    try {
      result = await api<Paged<Card> & { q: string }>(`/search?${qs}`);
    } catch (err) {
      failure = err instanceof ApiError && err.status === 429 ? 'rate' : 'down';
    }
  }
  const retry = `/khoj?${new URLSearchParams({ q, ...(type ? { type } : {}), ...(page > 1 ? { page: String(page) } : {}) })}`;

  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'खोज' }]} />
      <h1>खोज</h1>
      <p className="lead-text">प्रकाशित रचनाओं, रचनाकारों और विषयों में खोजें।</p>
      <form action="/khoj" method="get" className="search-form" role="search">
        <label htmlFor="q">रचना, रचनाकार या विषय खोजें</label>
        <div className="search-row">
          <input id="q" name="q" type="search" defaultValue={q} maxLength={100} required />
          <button className="button" type="submit">खोजें</button>
        </div>
      </form>

      {!q && <p>खोजने के लिए ऊपर शब्द लिखें।</p>}

      {failure === 'rate' && (
        <EmptyState title="बहुत अधिक खोज अनुरोध">
          <p>कृपया कुछ देर बाद फिर से प्रयास करें।</p>
          <p><Link className="button" href={retry}>फिर से प्रयास करें</Link></p>
        </EmptyState>
      )}
      {failure === 'down' && (
        <EmptyState title="खोज अभी उपलब्ध नहीं है">
          <p>सेवा से संपर्क नहीं हो सका।</p>
          <p><Link className="button" href={retry}>फिर से प्रयास करें</Link></p>
        </EmptyState>
      )}

      {result && result.items.length === 0 && (
        <EmptyState title="कोई परिणाम नहीं मिला">
          <p>“{q}” से मेल खाती कोई प्रकाशित रचना नहीं है। दूसरा शब्द आज़माएँ, या इन्हें देखें:</p>
          <p><Link href="/sahitya">साहित्य</Link> · <Link href="/rachnakar">रचनाकार</Link> · <Link href="/sangrah">संग्रह</Link></p>
        </EmptyState>
      )}
      {result && result.items.length > 0 && (
        <>
          <p role="status">“{q}” के लिए {result.total} परिणाम</p>
          <CardGrid items={result.items} />
          <Pagination basePath="/khoj" page={result.page} pageSize={result.page_size} total={result.total} params={{ q, type }} />
        </>
      )}
    </div>
  );
}
