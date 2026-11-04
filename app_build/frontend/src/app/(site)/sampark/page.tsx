import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/ContactForm';
import { apiOrNull } from '@/lib/api';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { Arrow } from '@/components/home/Ornament';
import { SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'संपर्क',
  description: 'उजास के संपादकों को संदेश भेजें।',
  alternates: { canonical: absUrl('/sampark') },
};

const LABELS: Array<[string, string, string]> = [
  ['contact_email', 'ईमेल', 'ई'], ['contact_phone', 'फ़ोन', 'फ़'], ['contact_address', 'पता', 'प'], ['contact_hours', 'कार्य समय', 'स'],
];

/** Contact details appear only when the owner has entered them in the settings; nothing is ever filled in for them. */
export default async function ContactPage() {
  const [settings, submit] = await Promise.all([
    apiOrNull<Record<string, string>>('/settings/public').catch(() => null).then((s) => s ?? {}),
    getSubmissionConfig(),
  ]);
  const shown = LABELS.filter(([k]) => settings[k]);
  const routes = [
    ...(submit.open ? [['र', 'अपनी रचना भेजनी है?', 'रचनाएँ संपर्क फ़ॉर्म से नहीं, रचना-पत्र से भेजें; वहीं संदर्भ क्रमांक मिलता है।', 'अपनी रचना भेजें', '/rachna-bhejein']] : []),
    ['©', 'रचना के अधिकार', 'प्रकाशित रचना के अधिकार, श्रेय या हटाने के अनुरोध की नीति पढ़ें।', 'कॉपीराइट और रचना नीति', '/niti/copyright-aur-rachna-niti'],
    ['गो', 'आपकी जानकारी', 'संदेश और ईमेल का उपयोग कैसे होता है, यह गोपनीयता नीति में है।', 'गोपनीयता नीति', '/niti/gopniyata'],
  ];
  return (
    <>
      <PageHero
        art="contact" id="ks-h1" size="xl" title="संपर्क" eyebrow="द्वार खुला है, बात कीजिए"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'संपर्क' }]}
        lead="सुझाव, प्रश्न या सहयोग के लिए संदेश भेजें — उजास के संपादक आपकी बात पढ़ते हैं।"
      >
        <div className="ph-ctas">
          <a className="cta-btn cta-primary" href="#ks-form">संदेश लिखें <Arrow /></a>
        </div>
      </PageHero>
      <GoldBand />

      <section id="ks-form" className="pg-sec pg-glow" aria-labelledby="ks-form-h">
        <div className={`pg-wrap ${shown.length > 0 ? 'ks-layout' : 'ks-solo'}`}>
          <div className="pg-card kr-form-card">
            <p className="pg-kick-line">संदेश-पत्र</p>
            <h2 id="ks-form-h" className="pg-h2">संपादकों को लिखें</h2>
            <p className="pg-hint kr-req">* वाले क्षेत्र आवश्यक हैं।</p>
            <ContactForm />
          </div>
          {shown.length > 0 && (
            <aside className="pg-panel ks-details" aria-label="संपर्क विवरण">
              <h2>संपर्क विवरण</h2>
              <dl>
                {shown.map(([k, label, mark]) => (
                  <div key={k}>
                    <span className="ks-mark" aria-hidden="true">{mark}</span>
                    <div><dt>{label}</dt><dd>{settings[k]}</dd></div>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </div>
      </section>

      <section className="pg-sec pg-ivory" aria-labelledby="ks-routes-h">
        <div className="pg-wrap">
          <SectionHead kicker="सही राह" title="शायद आप यह ढूँढ रहे हैं" id="ks-routes-h" />
          <div className={`pg-grid ${routes.length === 3 ? 'cols-3' : 'cols-2'}`}>
            {routes.map(([mark, title, text, cta, href]) => (
              <Link key={href} className="pg-card ks-route" href={href!}>
                <span className="pg-letter pg-letter-wine" aria-hidden="true">{mark}</span>
                <span className="ks-route-title">{title}</span>
                <span className="ks-route-text">{text}</span>
                <span className="ks-route-cta">{cta} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
