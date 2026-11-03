import Image from 'next/image';
import { SafeLink } from '../SafeLink';
import { HeroArtwork } from './HeroArtwork';
import { Arrow, BookIcon, LotusRule, PenIcon } from './Ornament';

/**
 * First screen: copy on a parchment ground at the left, the live quill scene at the right.
 * Copy is from the approved homepage brief; the submit button follows the form's open state (D-03).
 */
export function HomeHero({ submitOpen }: { submitOpen: boolean }) {
  return (
    <section className="hero" aria-labelledby="hero-h">
      <HeroArtwork />
      <Image className="hero-leaves" src="/art/leaves-top.svg" alt="" width={230} height={300} unoptimized />
      <Image className="hero-leaves hero-leaves-low" src="/art/leaves-low.svg" alt="" width={150} height={250} unoptimized />

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-eyebrow">हिंदी साहित्य की समकालीन डिजिटल पत्रिका</p>
          <div className="hero-title">
            <h1 id="hero-h">उजास</h1>
            <svg className="hero-swash" viewBox="0 0 640 70" aria-hidden="true">
              <defs>
                <linearGradient id="heroSwash" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" className="swash-1" />
                  <stop offset=".35" className="swash-2" />
                  <stop offset=".75" className="swash-3" />
                  <stop offset="1" className="swash-4" />
                </linearGradient>
              </defs>
              <path d="M4 44 C120 78 330 70 636 4 C350 62 140 68 4 48Z" fill="url(#heroSwash)" />
            </svg>
          </div>
          <p className="hero-tagline">अपनी बात — अपना मंच</p>
          <LotusRule width={420} />
          <p className="hero-lead">
            विचार, संवेदना और सृजन की वह साहित्यिक जगह, जहाँ हर रचनाकार को अपनी बात कहने का स्वतंत्र और सम्मानजनक मंच मिलता है।
          </p>
          <div className="hero-ctas">
            <SafeLink className="cta-btn cta-primary" href="/e-patrika">
              <BookIcon /> ई-पत्रिका पढ़ें <Arrow />
            </SafeLink>
            {submitOpen && (
              <SafeLink className="cta-btn cta-outline" href="/rachna-bhejein">
                <PenIcon /> अपनी रचना भेजें <Arrow />
              </SafeLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
