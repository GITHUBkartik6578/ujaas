/**
 * The hero quill: on load it dips, lifts out of the inkpot, flies to the open book, writes the right-hand page
 * (about 4 s) and rests on it. Afterwards the mouse carries it by the nib; clicking the inkpot puts it back in,
 * clicking the pot or the quill again picks it up. A tap does the same on touch screens.
 *
 * Every pose is anchored at the nib, in artwork units (viewBox 0 0 960 600). Only SVG transforms, opacity and
 * dash offsets change, so nothing in the page reflows. With reduced motion the quill starts at rest with the page
 * already written and does not follow the pointer.
 */

export interface Pose { x: number; y: number; r: number }
type Pt = { x: number; y: number };
type Sample = Pt & { d: number };

export const NIB: Pt = { x: 547, y: 384 };
export const REST: Pose = { x: 400, y: 446, r: 3 };
/** Quadratic handwriting lines on the right-hand page: x0 y0 cx cy x1 y1. */
export const LINES: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [254, 392, 340, 360, 428, 370], [254, 403, 341, 371, 430, 381], [254, 414, 342, 382, 432, 392],
  [254, 425, 343, 393, 434, 403], [254, 436, 344, 404, 436, 414], [280, 446, 345, 416, 420, 424],
];
export const TIMING = { delay: 600, write0: 2000, line: 560, hop: 130, settle: 650 };
/** Time the quill spends writing the page. */
export const writingTime = () => LINES.length * TIMING.line + (LINES.length - 1) * TIMING.hop;

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const c01 = (k: number) => Math.max(0, Math.min(1, k));

/** Arc-length table for one line, so the nib and the ink reveal move together. */
export function sampleLine(l: readonly [number, number, number, number, number, number]): Sample[] {
  const [x0, y0, cx, cy, x1, y1] = l;
  const pts: Sample[] = [];
  let len = 0, px = x0, py = y0;
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    len += Math.hypot(x - px, y - py);
    px = x; py = y;
    pts.push({ x, y, d: len });
  }
  for (const p of pts) p.d /= len;
  return pts;
}

export function pointAt(table: Sample[], f: number): Pt {
  for (let i = 1; i < table.length; i++) {
    const b = table[i]!;
    if (b.d >= f) {
      const a = table[i - 1]!;
      const k = (f - a.d) / (b.d - a.d || 1);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  const last = table[table.length - 1]!;
  return { x: last.x, y: last.y };
}

export interface QuillParts {
  art: HTMLElement;
  svg: SVGSVGElement;
  quill: SVGGElement;
  lip: SVGGElement;
  shadow: SVGPathElement;
  ripple: SVGEllipseElement;
  sheen: SVGPathElement;
  spark: SVGPathElement;
  hint: SVGEllipseElement;
  strokes: SVGPathElement[];
}

type Mode = 'intro' | 'free' | 'docked' | 'busy';
interface Step extends Pose { ms: number; fx?: (k: number) => void }

export class QuillController {
  private pose: Pose = { x: NIB.x, y: NIB.y, r: 0 };
  private target: Pose | Pt = REST;
  private mode: Mode = 'intro';
  private tables = LINES.map(sampleLine);
  private raf = 0;
  private followRaf = 0;
  private tweenRaf = 0;
  private back: ReturnType<typeof setTimeout> | undefined;
  private t0: number | null = null;

  constructor(private parts: QuillParts, private reduce: boolean) {}

  start() {
    if (this.reduce) {
      this.place(REST);
      this.mode = 'free';
      return;
    }
    this.setStrokes(() => 1);
    this.place(this.pose);
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.followRaf);
    cancelAnimationFrame(this.tweenRaf);
    clearTimeout(this.back);
  }

  move(cx: number, cy: number, pointerType: string) {
    if (this.reduce || this.mode === 'intro' || pointerType !== 'mouse') return;
    const raw = this.toArt(cx, cy);
    if (!raw) return;
    this.target = clampArt(raw);
    this.hint(raw);
    if (this.mode === 'free') this.chase(this.target);
  }

  leave() {
    if (this.reduce || this.mode === 'intro') return;
    this.hint(null);
    this.target = REST;
    if (this.mode === 'free') this.chase(REST);
  }

  down(cx: number, cy: number, pointerType: string, button: number) {
    if (this.reduce || this.mode === 'intro' || this.mode === 'busy') return;
    const mouse = pointerType === 'mouse';
    if (mouse && button !== 0) return;
    const raw = this.toArt(cx, cy);
    if (!raw) return;
    clearTimeout(this.back);
    if (this.mode === 'docked') {
      if (overPot(raw) || nearDockedQuill(raw)) {
        this.hint(null);
        this.target = mouse ? clampArt(raw) : REST;
        this.pickUp();
      }
      return;
    }
    if (overPot(raw)) {
      this.dock();
      return;
    }
    if (!mouse) {
      this.chase(clampArt(raw));
      this.back = setTimeout(() => { if (this.mode === 'free') this.chase(REST); }, 2500);
    }
  }

  private toArt(cx: number, cy: number): Pt | null {
    const m = this.parts.svg.getScreenCTM();
    if (!m) return null;
    const pt = this.parts.svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }

  private place(p: Pose) {
    this.pose = p;
    const dx = p.x - NIB.x, dy = p.y - NIB.y;
    const { quill, lip, shadow } = this.parts;
    quill.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${p.r.toFixed(2)} ${NIB.x} ${NIB.y})`);
    const inPot = Math.abs(dx) < 30 && p.y > 344;
    lip.setAttribute('opacity', inPot ? '1' : '0');
    shadow.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    shadow.setAttribute('opacity', !inPot && p.y > 356 ? '0.13' : '0');
  }

  private setStrokes(offset: (i: number) => number) {
    this.parts.strokes.forEach((s, i) => { s.style.strokeDashoffset = String(offset(i)); });
  }

  private ripple(k: number) {
    const o = k <= 0 || k >= 1 ? 0 : (k < 0.15 ? k / 0.15 : (1 - k) / 0.85) * 0.95;
    this.parts.ripple.setAttribute('opacity', o.toFixed(3));
    this.parts.ripple.setAttribute('transform', `translate(533 346) scale(${(0.3 + 1.2 * k).toFixed(3)}) translate(-533 -346)`);
  }

  private sheen(k: number) {
    this.parts.sheen.setAttribute('stroke-dashoffset', k <= 0 || k >= 1 ? '-1.2' : (0.14 - 1.19 * k).toFixed(3));
  }

  private spark(k: number) {
    const o = k <= 0 || k >= 1 ? 0 : k < 0.4 ? k / 0.4 : (1 - k) / 0.6;
    const s = k < 0.4 ? 0.3 + (0.85 * k) / 0.4 : 1.15 - (0.55 * (k - 0.4)) / 0.6;
    this.parts.spark.setAttribute('opacity', o.toFixed(3));
    this.parts.spark.setAttribute('transform', `translate(424 424) rotate(${(45 * k).toFixed(1)}) scale(${s.toFixed(3)}) translate(-424 -424)`);
  }

  private hint(raw: Pt | null) {
    const pot = !!raw && overPot(raw);
    const grab = !!raw && this.mode === 'docked' && (pot || nearDockedQuill(raw));
    const drop = pot && this.mode === 'free';
    this.parts.art.style.cursor = grab ? 'grab' : drop ? 'pointer' : '';
    this.parts.hint.style.opacity = drop ? '0.9' : '0';
  }

  /** Intro timeline: dip, lift, fly to the page, write every line, settle at rest. */
  private tick = (now: number) => {
    if (this.t0 == null) this.t0 = now;
    const t = now - this.t0 - TIMING.delay;
    const { write0, line, hop, settle } = TIMING;
    const step = line + hop;
    const writeEnd = write0 + writingTime();
    const done = writeEnd + settle;
    const lift: Pose = { x: NIB.x, y: 284, r: -5 };
    let pose: Pose = { x: NIB.x, y: NIB.y, r: 0 };

    if (t >= done) {
      this.setStrokes(() => 0);
      this.place(REST);
      this.ripple(1); this.sheen(1); this.spark(1);
      this.mode = 'free';
      this.raf = 0;
      return;
    }
    if (t >= 0 && t < 320) {
      pose = { x: NIB.x, y: NIB.y + 8 * Math.sin(Math.PI * ease(t / 320)), r: 0 };
    } else if (t >= 320 && t < 1000) {
      const k = ease((t - 320) / 680);
      pose = { x: NIB.x, y: NIB.y + (lift.y - NIB.y) * k, r: lift.r * k };
    } else if (t >= 1000 && t < write0) {
      const k = ease((t - 1000) / (write0 - 1000)), u = 1 - k;
      const s = this.tables[0]![0]!, cx = 430, cy = 196;
      pose = {
        x: u * u * lift.x + 2 * u * k * cx + k * k * s.x,
        y: u * u * lift.y + 2 * u * k * cy + k * k * s.y,
        r: lift.r + (4 - lift.r) * k,
      };
    } else if (t >= write0 && t < writeEnd) {
      const i = Math.min(LINES.length - 1, Math.floor((t - write0) / step));
      const local = t - write0 - i * step;
      this.setStrokes((j) => (j < i ? 0 : j > i ? 1 : 1 - c01(local / line)));
      if (local < line) {
        const p = pointAt(this.tables[i]!, local / line);
        pose = { x: p.x, y: p.y + Math.sin(t * 0.05), r: 4 + Math.sin(t * 0.03) * 1.8 };
      } else {
        const k = ease((local - line) / hop);
        const a = pointAt(this.tables[i]!, 1), b = this.tables[i + 1]![0]!;
        pose = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - 14 * Math.sin(Math.PI * k), r: 4 };
      }
    } else if (t >= writeEnd) {
      this.setStrokes(() => 0);
      const k = ease((t - writeEnd) / settle);
      const a = pointAt(this.tables[LINES.length - 1]!, 1);
      pose = { x: a.x + (REST.x - a.x) * k, y: a.y + (REST.y - a.y) * k - 12 * Math.sin(Math.PI * k), r: 4 + (REST.r - 4) * k };
    }
    this.ripple(c01((t - 120) / 800));
    this.sheen(c01((t - 450) / 1000));
    this.spark(c01((t - writeEnd) / 900));
    this.place(pose);
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Nib eases toward the target; the quill leans against the direction of travel. */
  private follow = () => {
    const p = this.pose, g = this.target;
    const x = p.x + (g.x - p.x) * 0.2, y = p.y + (g.y - p.y) * 0.2;
    const goalR = REST.r - Math.max(-16, Math.min(16, (x - p.x) * 1.6));
    const r = p.r + (goalR - p.r) * 0.18;
    this.place({ x, y, r });
    if (Math.abs(g.x - x) < 0.15 && Math.abs(g.y - y) < 0.15 && Math.abs(REST.r - r) < 0.05) {
      this.followRaf = 0;
      return;
    }
    this.followRaf = requestAnimationFrame(this.follow);
  };

  private chase(target: Pose | Pt) {
    this.target = target;
    if (!this.followRaf) this.followRaf = requestAnimationFrame(this.follow);
  }

  /** Scripted moves through waypoints; each step eases from the previous pose. */
  private tween(steps: Step[], done: () => void) {
    cancelAnimationFrame(this.followRaf);
    this.followRaf = 0;
    cancelAnimationFrame(this.tweenRaf);
    this.mode = 'busy';
    let i = 0, start: number | null = null;
    let from: Pose = { ...this.pose };
    const run = (now: number) => {
      if (start == null) start = now;
      const s = steps[i]!;
      const k = Math.min(1, (now - start) / s.ms), e = ease(k);
      this.place({ x: from.x + (s.x - from.x) * e, y: from.y + (s.y - from.y) * e, r: from.r + (s.r - from.r) * e });
      s.fx?.(k);
      if (k < 1) { this.tweenRaf = requestAnimationFrame(run); return; }
      i++;
      if (i >= steps.length) { this.tweenRaf = 0; done(); return; }
      from = { x: s.x, y: s.y, r: s.r };
      start = now;
      this.tweenRaf = requestAnimationFrame(run);
    };
    this.tweenRaf = requestAnimationFrame(run);
  }

  private dock() {
    this.hint(null);
    this.tween([
      { x: NIB.x, y: 296, r: 0, ms: 420 },
      { x: NIB.x, y: NIB.y, r: 0, ms: 380 },
      { x: NIB.x, y: NIB.y, r: 0, ms: 650, fx: (k) => this.ripple(k) },
    ], () => { this.mode = 'docked'; });
  }

  private pickUp() {
    this.tween([
      { x: NIB.x, y: 392, r: 0, ms: 140 },
      { x: NIB.x, y: 284, r: -5, ms: 480, fx: (k) => this.sheen(k) },
    ], () => { this.mode = 'free'; this.chase(this.target); });
  }
}

const clampArt = (p: Pt): Pt => ({ x: Math.max(150, Math.min(880, p.x)), y: Math.max(250, Math.min(560, p.y)) });

export const overPot = (p: Pt) => p.x >= 455 && p.x <= 612 && p.y >= 296 && p.y <= 512;

/** Hit test along the shaft while the quill stands in the pot. */
export function nearDockedQuill(p: Pt) {
  const ax = NIB.x, ay = NIB.y, vx = 762 - ax, vy = 18 - ay;
  const k = Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(p.x - (ax + vx * k), p.y - (ay + vy * k)) < 28;
}
