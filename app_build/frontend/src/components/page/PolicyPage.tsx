import Link from 'next/link';
import { Arrow, PenIcon } from '../home/Ornament';
import { CheckIcon, dev, InviteBand, SectionHead } from './Blocks';
import { GoldBand, PageHero } from './PageHero';

interface Section { readonly title: string; readonly text: string; readonly items?: readonly string[] }
type PolicyKey = 'privacy' | 'terms' | 'copyright';

const POLICIES: Record<PolicyKey, { title: string; href: string; text: string }> = {
  privacy: { title: 'गोपनीयता नीति', href: '/niti/gopniyata', text: 'हम आपकी जानकारी कैसे लेते, उपयोग करते और सुरक्षित रखते हैं।' },
  terms: { title: 'उपयोग की शर्तें', href: '/niti/upyog-ki-sharten', text: 'उजास की साइट और उसकी सामग्री के उपयोग के नियम।' },
  copyright: { title: 'कॉपीराइट और रचना नीति', href: '/niti/copyright-aur-rachna-niti', text: 'रचनाओं के अधिकार, मौलिकता और प्रकाशन की शर्तें।' },
};

interface Props {
  policy: PolicyKey;
  /** Short id prefix for headings and section anchors (pv, tm, cp). */
  prefix: string;
  eyebrow: string;
  lead: string;
  readTime: string;
  /** The thing the text is: नीति or शर्तें (used in the contents heading, the draft note and the closing line). */
  noun: 'नीति' | 'शर्तें';
  sections: readonly Section[];
  checks?: ReadonlyArray<{ readonly title: string; readonly text: string }>;
  submitOpen: boolean;
}

/**
 * The three policy pages (approved canvas): hero, a draft notice, a contents panel beside the numbered sections,
 * and links to the other policies. The copyright policy adds an at-a-glance list and a send invitation.
 */
export function PolicyPage({ policy, prefix, eyebrow, lead, readTime, noun, sections, checks, submitOpen }: Props) {
  const p = POLICIES[policy];
  const these = noun === 'शर्तें' ? 'इन शर्तों' : 'इस नीति';
  return (
    <>
      <PageHero
        art={policy} id={`${prefix}-h1`} size={policy === 'copyright' ? 'sm' : 'md'} title={p.title} eyebrow={eyebrow} lead={lead}
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'नीतियाँ' }, { label: p.title }]}
        meta={['अंतिम अद्यतन: [तिथि]', `पढ़ने का समय: ${readTime}`]}
      >
        <div className="ph-ctas">
          <a className="cta-btn cta-primary" href={`#${prefix}-1`}>{noun === 'शर्तें' ? 'शर्तें पढ़ें' : 'नीति पढ़ें'} <Arrow /></a>
          {policy === 'copyright' && submitOpen
            ? <Link className="cta-btn cta-outline" href="/rachna-bhejein"><PenIcon /> रचना भेजें</Link>
            : <Link className="cta-btn cta-outline" href="/sampark">प्रश्न पूछें</Link>}
        </div>
      </PageHero>
      <GoldBand />

      {checks && (
        <section className="pg-sec" aria-labelledby={`${prefix}-check-h`}>
          <div className="pg-wrap">
            <SectionHead kicker="एक नज़र में" title="रचना भेजने से पहले" id={`${prefix}-check-h`} />
            <ul className="pg-grid cols-4">
              {checks.map((k) => (
                <li key={k.title} className="pg-card cp-check">
                  <span className="ed-tick" aria-hidden="true"><CheckIcon /></span>
                  <strong>{k.title}</strong>
                  <span>{k.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className={`pg-wrap ${checks ? '' : 'pol-note-top'}`}>
        <p className="pg-note" role="note">
          <span><strong>प्रारूप:</strong> {noun === 'शर्तें' ? 'ये शर्तें प्रारूप रूप में हैं।' : policy === 'privacy' ? 'यह नीति का प्रारूप है।' : 'यह नीति प्रारूप रूप में है।'} अंतिम पाठ कानूनी समीक्षा के बाद प्रकाशित होगा।</span>
        </p>
      </div>

      <section className="pg-sec-tight" aria-label={`${p.title} का पाठ`}>
        <div className="pg-wrap pg-policy">
          <nav className="pg-panel pg-toc" aria-label={`${these} में`}>
            <p className="pg-toc-h">{these} में</p>
            <ol>
              {sections.map((s, i) => (
                <li key={s.title}><a href={`#${prefix}-${i + 1}`}><span className="pg-toc-num">{dev(i + 1)}</span>{s.title}</a></li>
              ))}
            </ol>
          </nav>
          <article className="pg-sheet pg-policy-body">
            {sections.map((s, i) => (
              <section key={s.title} id={`${prefix}-${i + 1}`}>
                <h2><span>{dev(i + 1)}</span>{s.title}</h2>
                <p>{s.text}</p>
                {s.items && s.items.length > 0 && (
                  <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
                )}
              </section>
            ))}
            <p className="pg-policy-foot">{these} से जुड़े किसी भी प्रश्न के लिए हमें <Link href="/sampark">संपर्क पृष्ठ</Link> से लिखें या [ईमेल पता] पर ईमेल करें।</p>
          </article>
        </div>
      </section>

      {policy === 'copyright' && submitOpen && (
        <InviteBand id={`${prefix}-ready`} title="अपनी रचना भेजने के लिए तैयार?" text="अपनी मौलिक रचना भेजिए। हर रचना संपादकीय समीक्षा के बाद ही प्रकाशित होती है, और उसका कॉपीराइट सदा आपके पास रहता है।">
          <Link className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> रचना भेजें</Link>
        </InviteBand>
      )}

      <section className="pg-sec pg-tint" aria-labelledby={`${prefix}-rel`}>
        <div className="pg-wrap">
          <SectionHead kicker="नीतियाँ" title="अन्य नीतियाँ भी पढ़ें" id={`${prefix}-rel`} />
          <div className="pg-grid cols-3">
            {(Object.keys(POLICIES) as PolicyKey[]).map((k) => {
              const r = POLICIES[k];
              const here = k === policy;
              return (
                <Link key={k} className="pg-card pg-rel" href={r.href} aria-current={here ? 'page' : undefined}>
                  <span className="pg-rel-top"><span className="pg-rel-title">{r.title}</span><span className={here ? 'pg-tag pg-tag-wine' : 'pg-tag'}>{here ? 'आप यहाँ हैं' : 'नीति'}</span></span>
                  <span className="pg-rel-text">{r.text}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
