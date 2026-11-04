import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiOrNull, type Card, type IssueFull } from '@/lib/api';
import { formatDate, typeLabel } from '@/lib/format';
import { absUrl, jsonLd } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { AuthorLinks } from '@/components/parts';
import { Arrow, PenIcon } from '@/components/home/Ornament';
import { dev, EmptyBox, InviteBand, ListIcon, SectionHead } from '@/components/page/Blocks';
import { IssueCover } from '@/components/page/IssueCover';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const i = await apiOrNull<IssueFull>(`/issues/${encodeURIComponent(slug)}`);
  if (!i) return { title: 'पृष्ठ नहीं मिला' };
  const description = i.editorial_intro?.slice(0, 200) ?? `उजास अंक ${i.issue_number}: ${i.period_label}`;
  const url = absUrl(`/e-patrika/${i.slug}`);
  return {
    title: `${i.title} (अंक ${i.issue_number})`, description, alternates: { canonical: url },
    openGraph: { type: 'website', title: i.title, description, url, locale: 'hi_IN', ...(i.cover ? { images: [absUrl(i.cover.url)] } : {}) },
  };
}

/** Consecutive items with the same section label form one group under a heading. */
function groups(items: IssueFull['items']) {
  const out: Array<{ label: string | null; items: IssueFull['items'] }> = [];
  for (const it of items) {
    const last = out.at(-1);
    if (last && last.label === it.section_label) last.items.push(it);
    else out.push({ label: it.section_label, items: [it] });
  }
  return out;
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [issue, submit] = await Promise.all([apiOrNull<IssueFull>(`/issues/${encodeURIComponent(slug)}`), getSubmissionConfig()]);
  if (!issue) notFound();
  const ld = {
    '@context': 'https://schema.org', '@type': 'PublicationIssue', name: issue.title, issueNumber: String(issue.issue_number),
    datePublished: issue.publication_date, inLanguage: 'hi', url: absUrl(`/e-patrika/${issue.slug}`),
    ...(issue.volume ? { isPartOf: { '@type': 'PublicationVolume', volumeNumber: issue.volume } } : {}),
    ...(issue.cover ? { image: absUrl(issue.cover.url) } : {}),
  };
  const grouped = groups(issue.items);
  const link = (c: Card) => `/rachna/${c.slug}?issue=${encodeURIComponent(issue.slug)}`;
  let n = 0;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <PageHero
        art="issue" id="ki-h1" size="sm" title={issue.title} eyebrow={`अंक ${dev(issue.issue_number)} · ${issue.period_label}`}
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'ई-पत्रिका', href: '/e-patrika' }, { label: issue.title }]}
        lead="इस अंक की सभी रचनाएँ, संपादक की बात और प्रकाशन विवरण — अनुक्रम से सीधे अपनी पसंद की रचना तक।"
      >
        <div className="ph-ctas">
          {issue.items.length > 0 && <a className="cta-btn cta-primary" href="#ki-contents"><ListIcon /> अनुक्रम देखें</a>}
          <Link className="cta-btn cta-outline" href="/e-patrika">सभी अंक</Link>
        </div>
      </PageHero>
      <GoldBand />

      <section className="pg-sec" aria-labelledby="ki-intro-h">
        <div className="pg-wrap ki-head">
          <figure className="ki-figure">
            <IssueCover i={issue} large priority />
            {issue.cover?.credit && <figcaption>आवरण: {issue.cover.credit}</figcaption>}
          </figure>
          <div>
            <p className="pg-kick-line">संपादक की ओर से</p>
            <h2 id="ki-intro-h" className="pg-h2">इस अंक के बारे में</h2>
            {issue.editorial_intro && <p className="ki-intro">{issue.editorial_intro}</p>}
            <dl className="pg-card ki-facts">
              <div><dt>अंक</dt><dd>{dev(issue.issue_number)}{issue.volume ? ` · खंड ${issue.volume}` : ''}</dd></div>
              <div><dt>अवधि</dt><dd>{issue.period_label}</dd></div>
              <div><dt>प्रकाशन तिथि</dt><dd>{formatDate(issue.publication_date)}</dd></div>
              {issue.publication_details && <div><dt>प्रकाशन विवरण</dt><dd>{issue.publication_details}</dd></div>}
            </dl>
          </div>
        </div>
      </section>

      <section id="ki-contents" className="pg-sec pg-ivory" aria-labelledby="ki-contents-h">
        <div className="pg-wrap pg-narrow">
          <SectionHead kicker="अनुक्रम" title="इस अंक में" id="ki-contents-h">
            {issue.items.length > 0 && <p>{dev(issue.items.length)} रचनाएँ{grouped.some((g) => g.label) ? ` · ${dev(grouped.length)} खंड` : ''}</p>}
          </SectionHead>
          {grouped.length === 0 ? (
            <EmptyBox title="इस अंक की रचनाएँ अभी उपलब्ध नहीं हैं।">
              <p>तब तक दूसरे अंक या साहित्य पढ़िए।</p>
              <div className="cta-row"><Link className="cta-btn cta-primary" href="/e-patrika">सभी अंक</Link><Link className="cta-btn cta-outline" href="/sahitya">साहित्य</Link></div>
            </EmptyBox>
          ) : (
            <div className="ki-groups">
              {grouped.map((g, gi) => (
                <details key={gi} className="pg-card ki-group" open>
                  <summary>
                    <span className="ki-group-name"><span className="ki-diamond" aria-hidden="true" />{g.label ?? 'रचनाएँ'}<span className="pg-tag">{dev(g.items.length)}</span></span>
                    <svg className="ki-chev" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </summary>
                  <ol className="ki-items">
                    {g.items.map((it) => (
                      <li key={it.content.slug}>
                        <span className="pg-medal pg-medal-sm" aria-hidden="true">{dev(++n)}</span>
                        <div>
                          <h3><Link href={link(it.content)}>{it.content.title}</Link></h3>
                          <p className="ct-index-meta"><span className="pg-tag">{typeLabel(it.content.type)}</span>{it.content.authors.length > 0 && <span className="ct-index-author"><AuthorLinks authors={it.content.authors} /></span>}</p>
                          <p className="ct-index-excerpt">{it.content.excerpt}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>

      <InviteBand id="ki-cta-h" title="और अंक पढ़ें, या अगले अंक के लिए लिखें" text="उजास के सभी अंक ई-पत्रिका में हैं; आपकी मौलिक रचना संपादकीय समीक्षा के बाद अगले अंक का हिस्सा बन सकती है।">
        <Link className="cta-btn cta-gold" href="/e-patrika">सभी अंक <Arrow /></Link>
        {submit.open && <Link className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> अपनी रचना भेजें</Link>}
      </InviteBand>
    </>
  );
}
