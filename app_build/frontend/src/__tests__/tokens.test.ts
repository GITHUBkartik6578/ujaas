import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');
const tokens = readFileSync(path.join(SRC, 'styles/tokens.css'), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? (f === '__tests__' ? [] : walk(p)) : [p];
  });
}

describe('design tokens (docs/design-tokens.md)', () => {
  it('define the documented brand colours', () => {
    const expected = {
      cream: '#fdf9f3', panel: '#fef6ee', blush: '#f4e2d1', sand: '#ceb194', notice: '#fee9cc',
      ink: '#362815', maroon: '#620206', copper: '#925d43', rust: '#793423', saffron: '#f5bf89',
    };
    for (const [name, hex] of Object.entries(expected)) {
      expect(tokens.toLowerCase()).toContain(`--color-${name}: ${hex};`);
    }
  });

  it('hex colours appear only in tokens.css, never scattered in components or styles', () => {
    const offenders = walk(SRC)
      .filter((f) => /\.(css|tsx?|jsx?)$/.test(f) && !f.endsWith(path.join('styles', 'tokens.css')))
      .filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, 'utf8').replace(/&#[0-9a-fA-F]+;/g, '')))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('body text is at least 18px and no green appears in the palette', () => {
    expect(tokens).toMatch(/--text-base: 1\.125rem/);
    const hexes = [...tokens.matchAll(/#([0-9a-f]{6})\b/gi)].map((m) => m[1]!);
    for (const h of hexes) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
      expect(g > r && g > b, `#${h} is green-dominant`).toBe(false);
    }
  });
});
