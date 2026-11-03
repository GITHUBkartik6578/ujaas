'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { LINES, QuillController } from './quill';

const linePath = (l: (typeof LINES)[number]) => `M${l[0]} ${l[1]} Q${l[2]} ${l[3]} ${l[4]} ${l[5]}`;
const RACHIS = 'M548 350 C572 240 640 140 762 18';

/**
 * The hero illustration in three aligned layers that share one viewBox and the same crop:
 * the scene behind the quill and the drape and flowers in front of it come from public/art (inlined on the server,
 * so the birds, petals and shimmer can animate); the quill, the page it writes and the inkpot rim it slides behind
 * are live SVG in between.
 */
export function HeroArtwork({ back, front }: { back: ReactNode; front: ReactNode }) {
  const art = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const ctl = useRef<QuillController | null>(null);

  useEffect(() => {
    const root = svg.current;
    const box = art.current;
    if (!root || !box) return;
    const q = <T extends Element>(id: string) => root.querySelector<T>(`[data-part="${id}"]`)!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const c = new QuillController({
      art: box,
      svg: root,
      quill: q<SVGGElement>('quill'),
      lip: q<SVGGElement>('lip'),
      shadow: q<SVGPathElement>('shadow'),
      ripple: q<SVGEllipseElement>('ripple'),
      sheen: q<SVGPathElement>('sheen'),
      spark: q<SVGPathElement>('spark'),
      hint: q<SVGEllipseElement>('hint'),
      strokes: Array.from(root.querySelectorAll<SVGPathElement>('[data-part="write"] path')),
    }, reduce);
    ctl.current = c;
    c.start();
    return () => { c.destroy(); ctl.current = null; };
  }, []);

  return (
    <div
      ref={art}
      className="hero-art"
      role="img"
      aria-label="नदी किनारे की प्राचीन इमारतें, खुली हस्तलिखित पुस्तक, दवात में कलम, फूलों का गुलदान, पुरानी जिल्ददार किताबें और मखमली कपड़ा"
      onPointerMove={(e) => ctl.current?.move(e.clientX, e.clientY, e.pointerType)}
      onPointerLeave={() => ctl.current?.leave()}
      onPointerDown={(e) => ctl.current?.down(e.clientX, e.clientY, e.pointerType, e.button)}
    >
      {back}
      <svg ref={svg} className="hero-layer quill-layer" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="qFeather" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" className="q-f1" />
            <stop offset=".35" className="q-f2" />
            <stop offset=".7" className="q-f3" />
            <stop offset="1" className="q-f4" />
          </linearGradient>
          <clipPath id="qSurface"><rect x="0" y="358" width="960" height="242" /></clipPath>
          <mask id="qWrite" maskUnits="userSpaceOnUse" x="0" y="0" width="960" height="600">
            <g data-part="write" className="q-reveal">
              {LINES.map((l, i) => <path key={i} pathLength={1} d={linePath(l)} />)}
            </g>
          </mask>
        </defs>

        <g className="q-ink" mask="url(#qWrite)">
          {LINES.map((l, i) => <path key={i} d={linePath(l)} />)}
        </g>
        <path data-part="spark" className="q-spark" d="M424 412 L426.5 421.5 L436 424 L426.5 426.5 L424 436 L421.5 426.5 L412 424 L421.5 421.5Z" opacity="0" />

        <g clipPath="url(#qSurface)">
          <path data-part="shadow" className="q-shadow" d="M547 384 Q640 393 734 406" opacity="0" />
        </g>
        <g data-part="quill">
          <path className="q-vane" d="M548 350 C556 268 604 170 680 92 C712 60 742 34 762 18 C768 70 752 132 722 192 C688 258 626 318 562 346Z" />
          <path className="q-rachis" d="M547 384 L548 350 C572 240 640 140 762 18" />
          <g className="q-barbs">
            <path d="M566 290 Q560 268 562 246" /><path d="M586 252 Q578 228 582 204" /><path d="M608 216 Q600 192 606 168" />
            <path d="M634 182 Q628 160 636 138" /><path d="M662 150 Q658 128 668 108" /><path d="M694 118 Q692 98 704 80" />
            <path d="M572 300 Q604 296 628 276" /><path d="M594 262 Q628 256 656 232" /><path d="M618 226 Q654 218 680 192" />
            <path d="M646 190 Q680 180 704 152" /><path d="M676 156 Q708 144 728 114" /><path d="M708 120 Q734 104 748 76" />
          </g>
          <path className="q-notch" d="M640 186 L652 176" />
          <path className="q-nib" d="M546.7 366 L547 386" />
          <path data-part="sheen" className="q-sheen" pathLength={1} d={RACHIS} strokeDasharray=".14 2" strokeDashoffset="-1.2" />
        </g>
        <g data-part="lip">
          <rect className="q-pot" x="500" y="352" width="66" height="34" rx="4" />
          <rect className="q-pot-lip" x="492" y="342" width="82" height="14" rx="6" />
          <g className="q-pot-bands"><path d="M506 362 H560" /><path d="M506 376 H560" /></g>
          <path className="q-pot-gem" d="M533 365 l4 4 -4 4 -4 -4z" />
        </g>
        <ellipse data-part="ripple" className="q-ripple" cx="533" cy="346" rx="28" ry="4.5" opacity="0" />
        <ellipse data-part="hint" className="q-hint" cx="533" cy="347" rx="38" ry="7.5" />
      </svg>
      {front}
    </div>
  );
}
