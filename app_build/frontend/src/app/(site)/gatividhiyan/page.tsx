import type { Metadata } from 'next';
import Link from 'next/link';
import { EVENTS } from '@/content/pages';
import { absUrl } from '@/lib/site';
import { Arrow } from '@/components/home/Ornament';
import { InviteBand, SectionHead, SendIcon } from '@/components/page/Blocks';
import { EventsTabs } from '@/components/page/EventsTabs';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'गतिविधियाँ',
  description: 'काव्य-गोष्ठियाँ, कथा-पाठ, पुस्तक-चर्चाएँ और साहित्यिक संवाद — उजास के आयोजनों की सूचना और घोषणाएँ।',
  alternates: { canonical: absUrl('/gatividhiyan') },
};

export default function EventsPage() {
  return (
    <>
      <PageHero
        art="events" id="ev-h1" size="md" title="गतिविधियाँ" eyebrow="साहित्य का उत्सव" tagline="आयोजन एवं घोषणाएँ"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'गतिविधियाँ' }]}
        lead="काव्य-गोष्ठियाँ, कथा-पाठ, पुस्तक-चर्चाएँ और साहित्यिक संवाद — उजास के आयोजनों की सूचना और घोषणाएँ यहाँ मिलेंगी।"
      >
        <div className="ph-ctas">
          <a className="cta-btn cta-primary" href="#ev-list">आयोजन देखें <Arrow /></a>
          <a className="cta-btn cta-outline" href="#ev-suggest">आयोजन का सुझाव दें</a>
        </div>
      </PageHero>
      <GoldBand />

      <section className="pg-sec" aria-labelledby="ev-kinds">
        <div className="pg-wrap">
          <SectionHead kicker="साहित्यिक मेल-जोल" title="हमारे आयोजनों के रूप" id="ev-kinds" />
          <div className="pg-grid cols-3">
            {EVENTS.kinds.map((k) => (
              <article key={k.title} className="pg-card ab-genre">
                <span className="pg-letter pg-letter-wine" aria-hidden="true">{k.letter}</span>
                <span><span className="ab-genre-name">{k.title}</span><span className="ab-genre-note">{k.text}</span></span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ev-list" className="pg-sec pg-tint" aria-labelledby="ev-list-h">
        <div className="pg-wrap">
          <EventsTabs upcoming={EVENTS.upcoming} />
        </div>
      </section>

      <div id="ev-suggest">
        <InviteBand id="ev-join" title="कोई आयोजन मिलकर करें?" text="काव्य-गोष्ठी, पुस्तक-चर्चा या किसी रचनाकार पर संवाद का विचार है? हमें लिखिए — हम साथ मिलकर साहित्य का उत्सव मनाएँगे।">
          <Link className="cta-btn cta-light" href="/sampark"><SendIcon /> सुझाव भेजें</Link>
          <Link className="cta-btn cta-gold" href="/sampark">संपर्क करें</Link>
        </InviteBand>
      </div>
    </>
  );
}
