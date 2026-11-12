import type { Metadata } from 'next';
import Link from 'next/link';
import { EDITORIAL } from '@/content/pages';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { Arrow, PenIcon } from '@/components/home/Ornament';
import { CheckIcon, InviteBand, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'संपादकीय',
  description: 'उजास की संपादकीय दृष्टि, उसके सरोकार और पाठकों व रचनाकारों से एक आत्मीय संवाद।',
  alternates: { canonical: absUrl('/sampadkiya') },
};

export default async function EditorialPage() {
  const { open } = await getSubmissionConfig();
  return (
    <>
      <PageHero
        art="editorial" id="ed-h1" title="संपादकीय" eyebrow="संपादक की कलम से"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'हमारे बारे में', href: '/hamare-bare-mein' }, { label: 'संपादकीय' }]}
        lead="हर अंक के साथ एक नई बातचीत — उजास की संपादकीय दृष्टि, उसके सरोकार और पाठकों व रचनाकारों से एक आत्मीय संवाद।"
      >
        <div className="ph-ctas">
          <a className="cta-btn cta-primary" href="#ed-letter">संपादकीय पढ़ें <Arrow /></a>
          <Link className="cta-btn cta-outline" href="/hamare-bare-mein">हमारे बारे में</Link>
        </div>
      </PageHero>
      <GoldBand />

      <section id="ed-letter" className="pg-sec" aria-labelledby="ed-letter-h">
        <div className="pg-wrap ed-letter">
          <article className="pg-sheet ed-sheet">
            <h2 id="ed-letter-h">उजाले की ओर एक यात्रा</h2>
            <div className="ed-body">
              <p>प्रिय पाठकों और रचनाकारों,</p>
              <p><span className="ed-drop" aria-hidden="true">उ</span><span className="visually-hidden">उ</span>जास का अर्थ है — रोशनी, उजाला। साहित्य भी वही उजाला है जो मन के अँधेरे कोनों तक पहुँचता है, प्रश्न जगाता है और संवेदना को जीवित रखता है। इसी विश्वास के साथ उजास आपके सामने है।</p>
              <p>हमारा प्रयास है कि यह पत्रिका हर उस आवाज़ का मंच बने जो सच्चाई और संवेदना से लिखी गई है — चाहे वह किसी प्रतिष्ठित रचनाकार की हो या किसी नए लेखक की पहली रचना। यहाँ रचना का मूल्य उसके शब्दों से तय होगा, नाम से नहीं।</p>
              <p>हर रचना को हम ध्यान, सम्मान और धैर्य से पढ़ते हैं। भाषा-संपादन और प्रूफरीडिंग के बाद ही कोई रचना प्रकाशित होती है, ताकि पाठकों तक हिंदी का सुंदर और शुद्ध रूप पहुँचे और रचनाकार की मूल आवाज़ भी बनी रहे।</p>
              <p>आइए, इस यात्रा में साथ चलें — पढ़ें, लिखें, सोचें और संवाद करें। आपकी अपनी बात के लिए उजास का मंच सदा खुला है।</p>
            </div>
            <p className="ed-sign"><span>सादर,</span><strong>विनय मिश्र</strong><span>प्रधान संपादक, उजास</span></p>
          </article>
          <aside className="pg-panel ed-aside" aria-label="प्रधान संपादक">
            <div className="ed-who">
              <span className="pg-medal ed-medal" aria-hidden="true">वि</span>
              <div>
                <p className="ed-name">श्री विनय मिश्र</p>
                <p className="ed-role">प्रधान संपादक</p>
              </div>
            </div>
            <p className="ed-quote">“रचना का मूल्य उसके शब्दों से तय होगा, नाम से नहीं।”</p>
            <Link className="cta-btn cta-gold" href="/sampark">संपादक को लिखें</Link>
          </aside>
        </div>
      </section>

      <section className="pg-sec pg-tint" aria-labelledby="ed-vision">
        <div className="pg-wrap">
          <SectionHead kicker="हम रचना में क्या देखते हैं" title="संपादकीय दृष्टि" id="ed-vision" />
          <div className="pg-grid cols-3">
            {EDITORIAL.pillars.map((p) => (
              <article key={p.title} className="pg-card ab-value">
                <span className="pg-medal" aria-hidden="true">{p.letter}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-sec" aria-labelledby="ed-commit">
        <div className="pg-wrap">
          <SectionHead kicker="रचनाकारों और पाठकों से वादा" title="हमारे संपादकीय सरोकार" id="ed-commit" />
          <ul className="pg-grid cols-2 ed-commits">
            {EDITORIAL.commitments.map((c) => (
              <li key={c.title} className="pg-card">
                <span className="ed-tick" aria-hidden="true"><CheckIcon /></span>
                <span><strong>{c.title}</strong><span>{c.text}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <InviteBand id="ed-join" title="संपादक से संवाद" text="कोई सुझाव, प्रश्न या प्रतिक्रिया? या कोई रचना जो आप उजास के पाठकों तक पहुँचाना चाहते हैं? हमें लिखिए — हम हर पत्र ध्यान से पढ़ते हैं।">
        {open && <Link className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> रचना भेजें</Link>}
        <Link className="cta-btn cta-gold" href="/sampark">संपर्क करें</Link>
      </InviteBand>
    </>
  );
}
