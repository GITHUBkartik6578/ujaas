import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Body } from '@/components/parts';
import { ALPHABET, formatDate, typeLabel } from '@/lib/format';
import { isBuilt } from '@/lib/routes';
import { jsonLd } from '@/lib/site';

describe('T-NAV-01 route registry: no link to a page that does not exist', () => {
  it('knows the built routes and dynamic prefixes', () => {
    for (const ok of ['/', '/sahitya', '/rachnakar', '/sangrah', '/khoj', '/rachna-bhejein', '/sampark', '/e-patrika', '/e-patrika/ank-1', '/rachna/abc', '/sahitya/kavita', '/rachnakar/ek', '/sangrah/x']) {
      expect(isBuilt(ok), ok).toBe(true);
    }
  });
  it('rejects unbuilt and malformed destinations', () => {
    for (const no of ['/e-patrika/', '/hamare-bare-mein', '/rachna/', '/admin', '#', '']) {
      expect(isBuilt(no), no).toBe(false);
    }
  });
});

describe('T-READ-02 reading body', () => {
  it('keeps every verse line break and stanza', () => {
    const html = renderToStaticMarkup(<Body body={'पंक्ति एक\nपंक्ति दो\n\nनया छंद'} format="verse" />);
    expect(html.match(/<br\/>/g)).toHaveLength(3);
    expect(html.match(/<p>/g)).toHaveLength(2);
  });
  it('renders prose as paragraphs and never as HTML', () => {
    const html = renderToStaticMarkup(<Body body={'पहला अनुच्छेद।\n\n<script>alert(1)</script>'} format="prose" />);
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('helpers', () => {
  it('labels content types in Hindi and falls back to the code', () => {
    expect(typeLabel('ghazal')).toBe('ग़ज़ल');
    expect(typeLabel('unknown')).toBe('unknown');
  });
  it('formats dates in Hindi and tolerates null', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate('2026-11-02T10:00:00Z')).toMatch(/2026|२०२६/);
  });
  it('has a Devanagari alphabet strip of single letters', () => {
    expect(ALPHABET.length).toBeGreaterThan(35);
    for (const l of ALPHABET) expect([...l]).toHaveLength(1);
  });
  it('JSON-LD cannot close its own script tag', () => {
    expect(jsonLd({ a: '</script><script>x' })).not.toContain('</script>');
  });
});
