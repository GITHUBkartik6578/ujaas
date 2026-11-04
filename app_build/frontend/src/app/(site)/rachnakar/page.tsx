import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type AuthorCard, type Paged } from '@/lib/api';
import { ALPHABET, TYPE_LABEL } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { AuthorTile, Pagination } from '@/components/parts';
import { PenIcon } from '@/components/home/Ornament';
import { dev, EmptyBox, InviteBand, SearchIcon } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'रचनाकार',
  description: 'उजास के रचनाकारों की सूची।',
  alternates: { canonical: absUrl('/rachnakar') },
};
const PAGE_SIZE = 24;

export default async function AuthorsPage({
  searchParams,
}: { searchParams: Promise<{ page?: string; startswith?: string; type?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  // A letter from the strip, or the start of a name typed in the search box (the API matches the name's beginning).
  const raw = (sp.startswith ?? '').trim().normalize('NFC');
  const startswith = raw && [...raw].length <= 12 ? raw : undefined;
  const type = sp.type && sp.type in TYPE_LABEL ? sp.type : undefined;
  const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
  if (startswith) qs.set('startswith', startswith);
  if (type) qs.set('type', type);
  const [list, submit] = await Promise.all([api<Paged<AuthorCard>>(`/authors?${qs}`), getSubmissionConfig()]);
  const link = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { startswith, type, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/rachnakar?${s}` : '/rachnakar';
  };
  const filtered = Boolean(startswith || type);
  const heading = startswith ? `“${startswith}” से शुरू होने वाले रचनाकार` : type ? `${TYPE_LABEL[type]} के रचनाकार` : 'सभी रचनाकार';
  return (
    <>
      <PageHero
        art="writers" id="rk-h1" title="रचनाकार" eyebrow="शब्दों के शिल्पी" tagline="रचनाकारों की छाँव"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'रचनाकार' }]}
        lead="उजास पर प्रकाशित रचनाकारों से मिलिए — नाम के पहले अक्षर या विधा से खोजिए और उनकी रचनाएँ पढ़िए।"
      >
        <form className="pg-searchbar" action="/rachnakar" method="get" role="search">
          <label htmlFor="rk-name" className="visually-hidden">रचनाकार का नाम</label>
          <SearchIcon />
          <input id="rk-name" name="startswith" type="search" maxLength={12} placeholder="रचनाकार का नाम लिखें" defaultValue={startswith && !ALPHABET.includes(startswith) ? startswith : ''} />
          {type && <input type="hidden" name="type" value={type} />}
          <button type="submit" className="cta-btn cta-primary">खोजें</button>
        </form>
      </PageHero>
      <GoldBand />

      <section className="pg-wrap rk-alpha" aria-labelledby="rk-alpha-h">
        <h2 id="rk-alpha-h" className="pg-chips-label">नाम के पहले अक्षर से</h2>
        <ul className="rk-letters">
          <li><Link href={link({ startswith: undefined })} aria-current={!startswith ? 'page' : undefined}>सभी</Link></li>
          {ALPHABET.map((l) => (
            <li key={l}><Link href={link({ startswith: l })} aria-current={startswith === l ? 'page' : undefined}>{l}</Link></li>
          ))}
        </ul>
      </section>

      <section className="pg-sec-tight" aria-labelledby="rk-list-h">
        <div className="pg-wrap">
          <div className="pg-listhead">
            <div>
              <p className="pg-kick-line">{dev(list.total)} रचनाकार</p>
              <h2 id="rk-list-h" className="pg-h2">{heading}</h2>
            </div>
            <nav className="pg-chips" aria-label="विधा के अनुसार">
              <Link className="pg-chip" href={link({ type: undefined })} aria-current={!type ? 'page' : undefined}>सभी विधाएँ</Link>
              {Object.entries(TYPE_LABEL).map(([k, label]) => (
                <Link key={k} className="pg-chip" href={link({ type: k })} aria-current={type === k ? 'page' : undefined}>{label}</Link>
              ))}
            </nav>
          </div>
          {list.items.length === 0 ? (
            <EmptyBox title={filtered ? 'इस खोज से कोई रचनाकार नहीं मिला' : 'अभी कोई रचनाकार नहीं है'}>
              <p>कोई दूसरा अक्षर या विधा चुनिए, या खोज साफ़ करके सभी रचनाकार देखिए।</p>
              {filtered && <div className="cta-row"><Link className="cta-btn cta-outline" href="/rachnakar">सभी रचनाकार देखें</Link></div>}
            </EmptyBox>
          ) : (
            <>
              <ul className="wr-grid">
                {list.items.map((a) => <AuthorTile key={a.slug} a={a} />)}
              </ul>
              <Pagination basePath="/rachnakar" page={list.page} pageSize={list.page_size} total={list.total} params={{ startswith, type }} />
            </>
          )}
        </div>
      </section>

      {submit.open && (
        <InviteBand id="rk-join" title="इस छाँव में आपका भी स्वागत है" text="अपनी पहली रचना भेजिए — प्रकाशित होते ही आपकी रचनाकार प्रोफ़ाइल भी यहाँ जुड़ जाएगी।">
          <Link className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> रचना भेजें</Link>
        </InviteBand>
      )}
    </>
  );
}
