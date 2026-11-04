import Link from 'next/link';
import { SiteFooter } from '@/components/HomeSections';
import { SiteHeader } from '@/components/SiteHeader';
import { SearchIcon, SectionHead } from '@/components/page/Blocks';
import { GoldBand, PageHero } from '@/components/page/PageHero';

const QUICK: Array<[string, string]> = [['साहित्य', '/sahitya'], ['रचनाकार', '/rachnakar'], ['संग्रह', '/sangrah'], ['मुख्य पृष्ठ', '/']];
const CARDS: Array<[string, string, string, string]> = [
  ['सा', 'साहित्य', 'कविता, ग़ज़ल, गीत, कहानी और विचार — सभी प्रकाशित रचनाएँ।', '/sahitya'],
  ['र', 'रचनाकार', 'उजास के रचनाकारों की सूची और उनकी रचनाएँ।', '/rachnakar'],
  ['सं', 'संग्रह', 'चुनी हुई रचनाओं के संपादित संग्रह।', '/sangrah'],
  ['ई', 'ई-पत्रिका', 'उजास के सभी अंक, नवीनतम से पुराने तक।', '/e-patrika'],
];

// Rendered with a real 404 status. Offers search and the main sections so a visitor is never stranded.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHero
          art="notfound" id="kn-h1" display="४०४" title="पृष्ठ नहीं मिला" eyebrow="पन्ना हवा में उड़ गया"
          lead="आप जो पृष्ठ खोज रहे हैं वह उपलब्ध नहीं है, या उसका पता बदल गया है।"
        >
          <form className="pg-searchbar" action="/khoj" method="get" role="search">
            <label htmlFor="nf-q" className="visually-hidden">खोजें</label>
            <SearchIcon />
            <input id="nf-q" name="q" type="search" maxLength={100} required placeholder="रचना, रचनाकार या विषय खोजें" />
            <button type="submit" className="cta-btn cta-primary">खोजें</button>
          </form>
          <nav className="pg-chips kn-quick" aria-label="मुख्य खंड">
            {QUICK.map(([label, href]) => <Link key={href} className="pg-chip" href={href}>{label}</Link>)}
          </nav>
        </PageHero>
        <GoldBand />
        <section className="pg-sec pg-glow" aria-labelledby="kn-go-h">
          <div className="pg-wrap">
            <SectionHead kicker="राह यहाँ से" title="इनमें से कहीं चलें" id="kn-go-h" />
            <div className="pg-grid cols-4">
              {CARDS.map(([mark, title, text, href]) => (
                <Link key={href} className="pg-card ks-route" href={href}>
                  <span className="pg-letter pg-letter-wine" aria-hidden="true">{mark}</span>
                  <span className="ks-route-title">{title}</span>
                  <span className="ks-route-text">{text}</span>
                  <span className="ks-route-cta">चलें →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
