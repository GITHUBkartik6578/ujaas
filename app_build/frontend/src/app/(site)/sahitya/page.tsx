import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type CategoryRow, type Card, type Paged } from '@/lib/api';
import { TYPE_LABEL } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { CardGrid, Pagination } from '@/components/parts';
import { LiteraryCategories } from '@/components/home/LiteraryCategories';
import { PenIcon } from '@/components/home/Ornament';
import { dev, EmptyBox, InviteBand } from '@/components/page/Blocks';
import { PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'साहित्य',
  description: 'उजास पर प्रकाशित कविता, कहानी, ग़ज़ल, विचार और अन्य रचनाएँ।',
  alternates: { canonical: absUrl('/sahitya') },
};

const PAGE_SIZE = 12;

export default async function LiteraturePage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const type = sp.type && sp.type in TYPE_LABEL ? sp.type : undefined;
  const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), ...(type ? { type } : {}) });
  const [list, cats, submit] = await Promise.all([
    api<Paged<Card>>(`/contents?${qs}`),
    api<{ items: CategoryRow[] }>('/categories'),
    getSubmissionConfig(),
  ]);
  const heading = type ? TYPE_LABEL[type]! : 'सभी रचनाएँ';
  return (
    <>
      <PageHero
        art="literature" id="sh-h1" title="साहित्य" eyebrow="रचनाओं का संसार" tagline="कविता से निबंध तक"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'साहित्य' }]}
        lead="उजास पर प्रकाशित कविता, ग़ज़ल, गीत, कहानी, विचार और अन्य रचनाएँ — विधा चुनिए और पढ़ना शुरू कीजिए।"
      />
      <LiteraryCategories current={type ? `/sahitya?type=${type}` : undefined} title="विधा के अनुसार चुनें" />

      <section className="pg-sec-tight" aria-labelledby="sh-works-h">
        <div className="pg-wrap">
          <div className="pg-listhead">
            <div>
              <p className="pg-kick-line">{dev(list.total)} प्रकाशित रचनाएँ</p>
              <h2 id="sh-works-h" className="pg-h2">{heading}</h2>
            </div>
            <nav className="pg-chips" aria-label="श्रेणियाँ">
              <span className="pg-chips-label">श्रेणियाँ:</span>
              {type && <Link className="pg-chip" href="/sahitya">सभी</Link>}
              {cats.items.map((c) => (
                <Link key={c.slug} className="pg-chip" href={`/sahitya/${c.slug}`}>{c.name} <small>({dev(c.works_count)})</small></Link>
              ))}
            </nav>
          </div>
          {list.items.length === 0 ? (
            <EmptyBox title={type ? 'इस विधा में अभी कोई रचना प्रकाशित नहीं हुई है' : 'अभी कोई रचना प्रकाशित नहीं है'}>
              <p>{type ? 'दूसरी विधा चुनिए, या इस विधा में अपनी रचना भेजकर शुरुआत कीजिए।' : 'कृपया बाद में देखें, या खोज आज़माएँ।'}</p>
              <div className="cta-row">
                {type ? <Link className="cta-btn cta-outline" href="/sahitya">सभी रचनाएँ देखें</Link> : <Link className="cta-btn cta-outline" href="/khoj">खोज</Link>}
              </div>
            </EmptyBox>
          ) : (
            <>
              <CardGrid items={list.items} />
              <Pagination basePath="/sahitya" page={list.page} pageSize={list.page_size} total={list.total} params={{ type }} />
            </>
          )}
        </div>
      </section>

      {submit.open && (
        <InviteBand id="sh-join" title="क्या आप भी लिखते हैं?" text="अपनी मौलिक रचना उजास को भेजिए — संपादकीय समीक्षा के बाद वह भी इसी संसार का हिस्सा बन सकती है।">
          <Link className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> रचना भेजें</Link>
        </InviteBand>
      )}
    </>
  );
}
