import Link from 'next/link';
import { Flourish, Mandala } from './Ornament';

/** Genre bar. Each genre opens the literature list filtered by its content type; "साहित्यिक लेख" opens the full list. */
export const GENRES: Array<{ label: string; href: string; icon: React.ReactNode }> = [
  {
    label: 'कविता', href: '/sahitya?type=kavita',
    icon: <svg width="46" height="40" viewBox="0 0 46 40"><path d="M23 8 Q14 3 3 5 V33 Q14 31 23 36 Q32 31 43 33 V5 Q32 3 23 8Z" /><path d="M23 8 V36" /><path d="M7 12 Q14 10.5 19 13M7 18 Q14 16.5 19 19M7 24 Q14 22.5 19 25M27 13 Q32 10.5 39 12M27 19 Q32 16.5 39 18M27 25 Q32 22.5 39 24" strokeWidth="1.3" /></svg>,
  },
  {
    label: 'ग़ज़ल', href: '/sahitya?type=ghazal',
    icon: <svg width="44" height="44" viewBox="0 0 44 44"><path d="M40 3 C26 4 14 14 10 30 L8 38 L12 36 C26 30 36 18 40 3Z" /><path d="M4 42 L28 14" /><path d="M15 27 L22 25M19 22 L27 19M24 16 L31 13" strokeWidth="1.2" /></svg>,
  },
  {
    label: 'गीत', href: '/sahitya?type=geet',
    icon: <svg width="46" height="40" viewBox="0 0 46 40"><path d="M23 8 Q14 3 3 5 V33 Q14 31 23 36 Q32 31 43 33 V5 Q32 3 23 8Z" /><path d="M23 8 V36" /><path d="M3 33 V37 Q14 35 23 40 Q32 35 43 37 V33" strokeWidth="1.4" /></svg>,
  },
  {
    label: 'कहानी', href: '/sahitya?type=kahani',
    icon: <svg width="40" height="44" viewBox="0 0 40 44"><rect x="5" y="3" width="30" height="38" rx="4" /><path d="M12 13 H28M12 20 H28M12 27 H28M12 34 H22" /></svg>,
  },
  {
    label: 'लघुकथा', href: '/sahitya?type=laghukatha',
    icon: <svg width="44" height="44" viewBox="0 0 44 44"><path d="M22 4 L26 17 L39 22 L26 27 L22 40 L18 27 L5 22 L18 17Z" /><path d="M36 5 V11M33 8 H39M8 33 V37M6 35 H10" strokeWidth="1.6" /></svg>,
  },
  {
    label: 'संस्मरण', href: '/sahitya?type=sansmaran',
    icon: <svg width="44" height="44" viewBox="0 0 44 44"><path d="M30 4 L40 14 L18 36 L6 38 L8 26Z" /><path d="M8 26 L18 36M26 8 L36 18M6 38 L13 31" /><circle cx="15" cy="29" r="2.4" /></svg>,
  },
  {
    label: 'निबंध', href: '/sahitya?type=nibandh',
    icon: <svg width="44" height="44" viewBox="0 0 44 44"><path d="M10 6 H34 Q38 6 38 10 V34" /><path d="M10 6 Q6 6 6 10 Q6 14 10 14 H14 V36 Q14 40 18 40 H36 Q40 40 40 36 V34 H22 V36 Q22 40 18 40" /><path d="M10 6 Q14 6 14 10 V14M20 16 H32M20 22 H32M20 28 H28" /></svg>,
  },
  {
    label: 'साहित्यिक लेख', href: '/sahitya',
    icon: <svg width="44" height="44" viewBox="0 0 44 44"><path d="M22 4 L40 13 L22 22 L4 13Z" /><path d="M4 21 L22 30 L40 21" /><path d="M4 29 L22 38 L40 29" /></svg>,
  },
];

export function LiteraryCategories() {
  return (
    <section className="genres" aria-labelledby="genres-h">
      <svg className="genres-band" viewBox="0 0 1440 240" preserveAspectRatio="none" aria-hidden="true">
        <path className="band-fill" d="M0 6 C320 150 1120 150 1440 6 L1440 240 L0 240 Z" />
        <path className="band-gold" d="M0 6 C320 150 1120 150 1440 6" vectorEffect="non-scaling-stroke" />
        <path className="band-gold-thin" d="M0 22 C320 166 1120 166 1440 22" vectorEffect="non-scaling-stroke" />
        <path className="band-gold-thin" d="M240 214 C520 236 920 236 1200 214" vectorEffect="non-scaling-stroke" />
      </svg>
      <Mandala className="genres-mandala genres-mandala-l" />
      <Mandala className="genres-mandala genres-mandala-r" />
      <h2 id="genres-h" className="visually-hidden">साहित्यिक विधाएँ</h2>
      <div className="genres-wrap">
        <div className="genres-panel">
          <Flourish className="genres-orn genres-orn-l" />
          <Flourish className="genres-orn genres-orn-r" />
          <ul className="genres-list">
            {GENRES.map((g) => (
              <li key={g.label}>
                <Link className="genre" href={g.href}>
                  <span className="genre-icon" aria-hidden="true">{g.icon}</span>
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
