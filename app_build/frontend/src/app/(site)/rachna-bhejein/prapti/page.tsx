import type { Metadata } from 'next';
import { ArtSvg } from '@/components/ArtSvg';
import { ReceiptTicket } from '@/components/ReceiptTicket';
import { CheckIcon, dev, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = { title: 'रचना प्राप्त हुई', robots: { index: false, follow: false } };

const NEXT: Array<[string, string]> = [
  ['समीक्षा की प्रतीक्षा', 'आपकी रचना संपादकीय कतार में है।'],
  ['संपादकीय समीक्षा', 'संपादक रचना पढ़ते हैं और ज़रूरत हो तो संशोधन माँग सकते हैं।'],
  ['निर्णय', 'स्वीकृत रचना प्रकाशन की तैयारी में जाती है; प्रकाशन की गारंटी नहीं है।'],
];

/** Receipt after a send. The ticket itself is client-side because the reference is kept in this tab only. */
export default function ReceiptPage() {
  return (
    <>
      <PageHero
        art="receipt" id="kg-h1" size="sm" title="आपकी रचना प्राप्त हुई" eyebrow="धन्यवाद"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'अपनी रचना भेजें', href: '/rachna-bhejein' }, { label: 'प्राप्ति' }]}
        badge={<span className="kg-badge" aria-hidden="true"><CheckIcon size={36} /></span>}
        lead="आपकी रचना उजास तक पहुँच गई है। नीचे अपना संदर्भ क्रमांक देखें और उसे सुरक्षित रखें।"
      />
      <GoldBand />

      <section className="pg-sec pg-glow" aria-labelledby="kg-ref-h">
        <div className="pg-wrap pg-narrow">
          <ReceiptTicket mark={<ArtSvg file="ujaas-mark-light.svg" scope="kg" className="kg-mark" />} />

          <div className="kg-next">
            <SectionHead title="आगे क्या होगा" id="kg-next-h" />
            <ol className="pg-grid cols-3">
              {NEXT.map(([title, text], i) => (
                <li key={title} className="pg-card kg-step">
                  <span className="pg-medal pg-medal-sm" aria-hidden="true">{dev(i + 1)}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
