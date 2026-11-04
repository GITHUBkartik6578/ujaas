import type { Metadata } from 'next';
import Link from 'next/link';
import { ABOUT } from '@/content/pages';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { GENRES } from '@/components/home/LiteraryCategories';
import { Arrow, BookIcon, PenIcon } from '@/components/home/Ornament';
import { dev, InviteBand, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'हमारे बारे में',
  description: 'उजास हिंदी साहित्य, रचनात्मक अभिव्यक्ति, संस्कृति और सार्थक संवाद का एक विचारशील डिजिटल घर है।',
  alternates: { canonical: absUrl('/hamare-bare-mein') },
};

const genreHref = (label: string) => GENRES.find((g) => g.label === label)?.href ?? '/sahitya';

export default async function AboutPage() {
  const { open } = await getSubmissionConfig();
  return (
    <>
      <PageHero
        art="about" id="ab-h1" size="md" title="हमारे बारे में" eyebrow="उजास का परिचय" tagline="अपनी बात — अपना मंच"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'हमारे बारे में' }]}
        lead="उजास हिंदी साहित्य, रचनात्मक अभिव्यक्ति, संस्कृति और सार्थक संवाद का एक विचारशील डिजिटल घर है — जहाँ हर रचनाकार की आवाज़ को सम्मान मिलता है और हर पाठक को अच्छा साहित्य।"
      >
        <div className="ph-ctas">
          <Link className="cta-btn cta-primary" href="/e-patrika"><BookIcon /> ई-पत्रिका पढ़ें <Arrow /></Link>
          {open && <Link className="cta-btn cta-outline" href="/rachna-bhejein"><PenIcon /> अपनी रचना भेजें</Link>}
        </div>
      </PageHero>
      <GoldBand />

      <section className="pg-sec" aria-labelledby="ab-what">
        <div className="pg-wrap ab-what">
          <div>
            <p className="pg-kick-line">उजास क्या है</p>
            <h2 id="ab-what" className="pg-h2">शब्दों का उजाला, विचारों का मंच</h2>
            <p className="ab-p">उजास हिंदी साहित्य की एक समकालीन डिजिटल पत्रिका है। यहाँ कविता, ग़ज़ल, गीत, कहानी, लघुकथा, संस्मरण, निबंध और साहित्यिक लेख एक ही मंच पर पढ़े और सराहे जाते हैं।</p>
            <p className="ab-p pg-muted">हमारा विश्वास है कि हर रचनाकार के पास कहने को अपनी बात होती है। उजास उस बात को स्वतंत्र, सम्मानजनक और सुंदर ढंग से पाठकों तक पहुँचाने का प्रयास है — एक ऐसी जगह जो समकालीन साहित्यिक संस्था जैसी गरिमा रखे, पर हर नए रचनाकार के लिए खुली रहे।</p>
          </div>
          <figure className="pg-panel ab-quote">
            <blockquote>विचार, संवेदना और सृजन की वह साहित्यिक जगह, जहाँ हर रचनाकार को अपनी बात कहने का स्वतंत्र और सम्मानजनक मंच मिलता है।</blockquote>
            <figcaption>उजास का संकल्प</figcaption>
          </figure>
        </div>
      </section>

      <section className="pg-sec pg-tint" aria-labelledby="ab-values">
        <div className="pg-wrap">
          <SectionHead kicker="हमारी पहचान" title="हमारे मूल्य" id="ab-values" />
          <div className="pg-grid cols-4">
            {ABOUT.values.map((v, i) => (
              <article key={v.title} className="pg-card ab-value">
                <span className="pg-medal" aria-hidden="true">{dev(i + 1)}</span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-sec" aria-labelledby="ab-publish">
        <div className="pg-wrap">
          <SectionHead kicker="साहित्यिक विधाएँ" title="हम क्या प्रकाशित करते हैं" id="ab-publish" />
          <div className="pg-grid cols-4">
            {ABOUT.genres.map((g) => (
              <Link key={g.label} className="pg-card ab-genre" href={genreHref(g.label)}>
                <span className="pg-letter" aria-hidden="true">{g.letter}</span>
                <span><span className="ab-genre-name">{g.label}</span><span className="ab-genre-note">{g.note}</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-sec ab-lead" aria-labelledby="ab-lead">
        <div className="pg-wrap ab-lead-row">
          <div className="ab-lead-mark" aria-hidden="true">वि</div>
          <div>
            <p className="pg-kick-line ab-lead-kick">संपादकीय नेतृत्व</p>
            <h2 id="ab-lead">श्री विनय मिश्र</h2>
            <p className="ab-lead-role">प्रधान संपादक, उजास</p>
            <p className="ab-lead-text">उजास की संपादकीय दिशा और साहित्यिक दृष्टि श्री विनय मिश्र के नेतृत्व में आकार लेती है। हर अंक और हर रचना उसी गरिमा और सावधानी से पाठकों तक पहुँचती है, जिसकी हिंदी साहित्य हक़दार है।</p>
            <Link className="cta-btn cta-gold" href="/sampadkiya">संपादकीय पढ़ें <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="pg-sec" aria-labelledby="ab-steps">
        <div className="pg-wrap">
          <SectionHead kicker="संपादकीय प्रक्रिया" title="रचना से प्रकाशन तक" id="ab-steps">
            <p>उजास पर कोई भी रचना स्वतः प्रकाशित नहीं होती। हर रचना इन सात चरणों से होकर पाठकों तक पहुँचती है।</p>
          </SectionHead>
          <ol className="pg-steps" aria-label="संपादकीय प्रक्रिया के चरण">
            {ABOUT.steps.map((s, i) => (
              <li key={s.label}>
                <span className="pg-medal" aria-hidden="true">{dev(i + 1)}</span>
                <h3>{s.label}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <InviteBand id="ab-join" title="आइए, इस उजाले का हिस्सा बनिए" text="पढ़िए, लिखिए और अपनी रचना भेजिए — उजास हर संवेदनशील पाठक और हर सच्चे रचनाकार का स्वागत करता है।">
        {open && <Link className="cta-btn cta-light" href="/rachna-bhejein"><PenIcon /> रचना भेजें</Link>}
        <Link className="cta-btn cta-gold" href="/e-patrika">ई-पत्रिका पढ़ें</Link>
      </InviteBand>
    </>
  );
}
