import type { Metadata } from 'next';
import Link from 'next/link';
import { SubmissionForm } from '@/components/SubmissionForm';
import { getSubmissionConfig } from '@/lib/submission';
import { absUrl } from '@/lib/site';
import { Arrow } from '@/components/home/Ornament';
import { dev, MailIcon, SectionHead, SendIcon } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

export const metadata: Metadata = {
  title: 'अपनी रचना भेजें',
  description: 'अपनी मौलिक रचना उजास को भेजें। हर रचना संपादकीय समीक्षा के बाद ही प्रकाशित होती है।',
  alternates: { canonical: absUrl('/rachna-bhejein') },
};

// The seven steps follow the submission states in docs/editorial-workflow.md; they promise nothing the site does not do.
const STEPS: Array<[string, string]> = [
  ['रचना चुनें', 'अपनी मौलिक रचना तैयार रखें।'],
  ['फ़ॉर्म भरें', 'नाम, ईमेल, प्रकार, शीर्षक और रचना।'],
  ['सहमति दें', 'तीनों सहमतियाँ आवश्यक हैं।'],
  ['भेजें', 'खाता बनाए बिना, एक क्लिक में।'],
  ['संदर्भ क्रमांक', 'प्राप्ति पृष्ठ पर आपका क्रमांक।'],
  ['संपादकीय समीक्षा', 'संपादक रचना पढ़ते हैं; संशोधन भी माँग सकते हैं।'],
  ['निर्णय', 'स्वीकृत रचना प्रकाशन की तैयारी में जाती है।'],
];

const n = (v: number) => dev(v.toLocaleString('en-IN'));

export default async function SubmitPage() {
  const config = await getSubmissionConfig();
  const open = Boolean(config.open && config.version && config.consents && config.body_max);
  const max = config.body_max;
  const faqs: Array<[string, string]> = [
    ['क्या रचनाकार खाता बनाना ज़रूरी है?', 'नहीं। रचना भेजने के लिए कोई खाता नहीं चाहिए; बस यह फ़ॉर्म भरें।'],
    ['मेरा ईमेल सार्वजनिक होगा?', 'नहीं। ईमेल केवल संपादकीय संपर्क के लिए है और साइट पर कहीं नहीं दिखता। विस्तार गोपनीयता नीति में है।'],
    ['रचना कितनी लंबी हो सकती है?', `${max ? `रचना अधिकतम ${n(max)} अक्षरों तक` : 'रचना की सीमा फ़ॉर्म पर दिखती है'}, शीर्षक १६० और संक्षिप्त परिचय ३०० अक्षरों तक।`],
    ['भेजने के बाद क्या होगा?', 'आपको एक संदर्भ क्रमांक मिलेगा। रचना पहले समीक्षा की प्रतीक्षा में रहती है, फिर संपादक उसे पढ़ते हैं।'],
    ['क्या हर रचना प्रकाशित होती है?', 'नहीं। हर रचना संपादकीय समीक्षा के बाद ही प्रकाशित होती है; संपादक संशोधन माँग सकते हैं या रचना अस्वीकार कर सकते हैं।'],
  ];
  return (
    <>
      <PageHero
        art="submit" id="kr-h1" size="sm" title="अपनी रचना भेजें" eyebrow="आपकी कलम, उजास का मंच"
        crumbs={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'अपनी रचना भेजें' }]}
        lead="रचनाकार खाता नहीं चाहिए। भेजने के बाद आपको एक संदर्भ क्रमांक मिलेगा, और हर रचना की संपादकीय समीक्षा होगी।"
      >
        <div className="ph-ctas">
          {open && <a className="cta-btn cta-primary" href="#kr-form"><SendIcon /> फ़ॉर्म भरें</a>}
          <a className="cta-btn cta-outline" href="#kr-steps">प्रक्रिया जानें</a>
        </div>
      </PageHero>
      <GoldBand />

      <section id="kr-steps" className="pg-sec pg-glow" aria-labelledby="kr-steps-h">
        <div className="pg-wrap">
          <SectionHead kicker="रचना की यात्रा" title="भेजने से निर्णय तक, सात चरण" id="kr-steps-h" />
          <ol className="pg-steps pg-steps-light">
            {STEPS.map(([title, text], i) => (
              <li key={title} className={i === 3 ? 'is-key' : undefined}>
                <span className={i === 3 ? 'pg-medal' : 'pg-medal kr-medal-light'} aria-hidden="true">{dev(i + 1)}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="kr-form" className="pg-sec pg-ivory" aria-labelledby="kr-form-h">
        <div className="pg-wrap">
          {open ? (
            <div className="kr-layout">
              <div className="pg-card kr-form-card">
                <p className="pg-kick-line">रचना-पत्र</p>
                <h2 id="kr-form-h" className="pg-h2">अपनी रचना यहाँ लिखें</h2>
                <p className="pg-hint kr-req">* वाले क्षेत्र आवश्यक हैं।</p>
                <SubmissionForm config={{ version: config.version!, consents: config.consents!, body_max: config.body_max! }} />
              </div>
              <aside className="kr-aside" aria-labelledby="kr-guide-h">
                <div className="pg-panel kr-guide">
                  <h2 id="kr-guide-h">भेजने से पहले</h2>
                  <ul>
                    <li>केवल अपनी मौलिक रचना भेजें।</li>
                    <li>रचना हिंदी में हो; देवनागरी में लिखें या चिपकाएँ।</li>
                    <li>रचना {n(max!)} अक्षरों तक, शीर्षक १६० अक्षरों तक।</li>
                    <li>ईमेल सार्वजनिक नहीं होगा; उपनाम वैकल्पिक है।</li>
                    <li>हर रचना संपादकीय समीक्षा के बाद ही प्रकाशित होती है।</li>
                  </ul>
                </div>
                <p className="pg-note kr-policy">
                  <span><strong>विस्तृत नीति:</strong> रचना के अधिकार और प्रकाशन की शर्तें <Link href="/niti/copyright-aur-rachna-niti">कॉपीराइट और रचना नीति</Link> में, और आपकी जानकारी का उपयोग <Link href="/niti/gopniyata">गोपनीयता नीति</Link> में।</span>
                </p>
              </aside>
            </div>
          ) : (
            <div className="pg-empty" role="status">
              <span className="pg-empty-mark" aria-hidden="true"><MailIcon /></span>
              <h2 id="kr-form-h" className="pg-empty-title">रचनाएँ अभी स्वीकार नहीं की जा रहीं</h2>
              <p>यह सुविधा जल्द शुरू होगी। तब तक आप साहित्य पढ़ सकते हैं या संपर्क कर सकते हैं।</p>
              <div className="cta-row">
                <Link className="cta-btn cta-primary" href="/sahitya">साहित्य पढ़ें <Arrow /></Link>
                <Link className="cta-btn cta-outline" href="/sampark">संपर्क</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="pg-sec" aria-labelledby="kr-faq-h">
        <div className="pg-wrap pg-text">
          <SectionHead kicker="जिज्ञासा" title="अक्सर पूछे जाने वाले प्रश्न" id="kr-faq-h" />
          <div className="kr-faqs">
            {faqs.map(([q, a], i) => (
              <details key={q} className="pg-card kr-faq" open={i === 0}>
                <summary><span>{q}</span><span className="kr-plus" aria-hidden="true">+</span></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
