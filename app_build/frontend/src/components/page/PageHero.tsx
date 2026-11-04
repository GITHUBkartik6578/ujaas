import Link from 'next/link';
import { ArtSvg } from '../ArtSvg';
import { LotusRule } from '../home/Ornament';

export interface Crumb { label: string; href?: string }

interface Props {
  /** Page key: the artwork is public/art/page-<art>.svg and its motion is scoped to `.art-<art>` in page-art.css. */
  art: string;
  /** Text for `{{name}}` slots in the artwork. */
  artVars?: Record<string, string>;
  id: string;
  crumbs?: Crumb[];
  eyebrow?: string;
  /** A small badge shown where the eyebrow goes (the reading page's type pill). */
  badge?: React.ReactNode;
  /** The h1. With `display`, it sits under the decorative display text instead of being the display text. */
  title: string;
  /** Size of the display heading: xl for one short word, sm for long titles. */
  size?: 'xl' | 'lg' | 'md' | 'sm';
  /** Large decorative text shown above the h1 (the 404 numerals); hidden from assistive technology. */
  display?: string;
  tagline?: string;
  lead?: React.ReactNode;
  meta?: string[];
  children?: React.ReactNode;
}

/**
 * The hero every inner page shares (approved canvas "UJAAS Homepage"): parchment ground, the page's own riverside
 * scene at the right, the copy column with breadcrumb, eyebrow, display heading with the gold swash, lotus rule,
 * lead and actions. The scene is decorative; below 960px it moves under the copy.
 */
export function PageHero({ art, artVars, id, crumbs, eyebrow, badge, title, size = 'lg', display, tagline, lead, meta, children }: Props) {
  const swash = `phSwash-${art}`;
  return (
    <section className={`ph ph-${display ? 'xl' : size}`} aria-labelledby={id}>
      <div className="ph-art">
        <ArtSvg file={`page-${art}.svg`} scope={art} className={`ph-art-svg art-${art}`} slice vars={artVars} />
      </div>
      <ArtSvg file="leaves-top.svg" scope={`lt-${art}`} className="ph-leaves uj-leaves uj-leaves-top" />
      <div className="ph-inner">
        <div className="ph-copy">
          {crumbs && crumbs.length > 0 && (
            <nav className="ph-crumbs" aria-label="पथ">
              <ol>
                {crumbs.map((c, i) => (
                  <li key={i}>{c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}</li>
                ))}
              </ol>
            </nav>
          )}
          {eyebrow && <p className="ph-eyebrow">{eyebrow}</p>}
          {badge}
          <div className="ph-title">
            {display ? <p className="ph-display" aria-hidden="true">{display}</p> : <h1 id={id}>{title}</h1>}
            <svg className="ph-swash" viewBox="0 0 640 70" aria-hidden="true">
              <defs>
                <linearGradient id={swash} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" className="swash-1" />
                  <stop offset=".35" className="swash-2" />
                  <stop offset=".75" className="swash-3" />
                  <stop offset="1" className="swash-4" />
                </linearGradient>
              </defs>
              <path d="M4 44 C120 78 330 70 636 4 C350 62 140 68 4 48Z" fill={`url(#${swash})`} />
            </svg>
          </div>
          {display && <h1 id={id} className="ph-sub">{title}</h1>}
          {tagline && <p className="ph-tagline">{tagline}</p>}
          <LotusRule width={420} />
          {lead && <p className="ph-lead">{lead}</p>}
          {meta && meta.length > 0 && (
            <p className="ph-meta">{meta.map((m) => <span key={m}>{m}</span>)}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

/** Wine band with a gold edge under every hero. */
export const GoldBand = () => <div className="gold-band" aria-hidden="true" />;
