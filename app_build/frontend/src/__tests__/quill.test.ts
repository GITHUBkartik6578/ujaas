import { describe, expect, it } from 'vitest';
import { LINES, NIB, REST, TIMING, nearDockedQuill, overPot, pointAt, sampleLine, writingTime } from '@/components/home/quill';

describe('hero quill', () => {
  it('writes the whole page in about four seconds', () => {
    expect(writingTime()).toBeGreaterThan(3600);
    expect(writingTime()).toBeLessThan(4400);
    expect(TIMING.write0).toBeGreaterThan(TIMING.delay);
  });

  it('moves the nib by arc length, from the start to the end of each line', () => {
    for (const l of LINES) {
      const table = sampleLine(l);
      expect(table[0]!.d).toBe(0);
      expect(table[table.length - 1]!.d).toBeCloseTo(1, 6);
      const start = pointAt(table, 0), end = pointAt(table, 1);
      expect(start.x).toBeCloseTo(l[0], 6);
      expect(end).toEqual({ x: l[4], y: l[5] });
    }
  });

  it('rests on the book, not in the pot, and the pot and docked quill are hit targets', () => {
    expect(overPot(REST)).toBe(false);
    expect(overPot({ x: 533, y: 346 })).toBe(true);
    expect(nearDockedQuill({ x: 650, y: 200 })).toBe(true);
    expect(nearDockedQuill({ x: 300, y: 200 })).toBe(false);
    expect(overPot(NIB)).toBe(true);
  });
});
