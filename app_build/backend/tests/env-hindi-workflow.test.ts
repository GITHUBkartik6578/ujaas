import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';
import { graphemeLength, hasForbiddenControlChars, searchFolded, searchNormalise, toStoredText } from '../src/lib/hindi.js';
import { sanitizeRichText, stripHtml } from '../src/lib/sanitize.js';
import { passwordProblems } from '../src/lib/password.js';
import { newReferenceId, saltedHash } from '../src/lib/hash.js';
import { assertContentTransition, assertSubmissionTransition, publishBlockers } from '../src/lib/workflow.js';
import { publishedFilter } from '../src/lib/queries.js';

const base = {
  MONGODB_URI: 'mongodb://localhost/x',
  SESSION_SECRET: 's'.repeat(32),
  IP_HASH_SALT: 'i'.repeat(16),
  PUBLIC_BASE_URL: 'http://localhost:3000',
};

describe('T-DEP-01 environment validation', () => {
  it('fails loudly with a readable list when config is missing', () => {
    expect(() => parseEnv({})).toThrowError(/Invalid environment configuration/);
    expect(() => parseEnv({})).toThrowError(/MONGODB_URI/);
    expect(() => parseEnv({})).toThrowError(/SESSION_SECRET/);
  });
  it('rejects a short session secret', () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: 'short' })).toThrowError(/SESSION_SECRET/);
  });
  it('keeps retention disabled while unset (D-02)', () => {
    const env = parseEnv(base);
    expect(env.RETENTION_DAYS_SUBMISSIONS).toBeUndefined();
    expect(env.RETENTION_DAYS_CONTACT).toBeUndefined();
    expect(env.RETENTION_DAYS_LOGS).toBeUndefined();
    expect(parseEnv({ ...base, RETENTION_DAYS_SUBMISSIONS: '' }).RETENTION_DAYS_SUBMISSIONS).toBeUndefined();
  });
  it('rejects a bad retention value', () => {
    expect(() => parseEnv({ ...base, RETENTION_DAYS_SUBMISSIONS: '-3' })).toThrowError(/RETENTION_DAYS_SUBMISSIONS/);
  });
  it('defaults to only site_admin enabled (D-05) and rejects unknown roles', () => {
    expect(parseEnv(base).ENABLED_ROLES).toEqual(['site_admin']);
    expect(() => parseEnv({ ...base, ENABLED_ROLES: 'site_admin,boss' })).toThrowError(/unknown role/);
  });
  it('requires https in production', () => {
    expect(() => parseEnv({ ...base, NODE_ENV: 'production' })).toThrowError(/https/);
    expect(parseEnv({ ...base, NODE_ENV: 'production', PUBLIC_BASE_URL: 'https://ujaas.example' }).NODE_ENV).toBe('production');
  });
});

describe('T-HI-02 Hindi text rules', () => {
  it('stores NFC and normalises line endings but keeps verse line breaks', () => {
    const decomposed = 'क़'; // क + nukta
    expect(toStoredText(decomposed)).toBe(decomposed.normalize('NFC'));
    const poem = 'पहली पंक्ति\r\nदूसरी पंक्ति\n\nनया छंद';
    expect(toStoredText(poem)).toBe('पहली पंक्ति\nदूसरी पंक्ति\n\nनया छंद');
    expect(toStoredText(poem).split('\n').length).toBe(4);
  });
  it('rejects control characters but allows newline and tab', () => {
    expect(hasForbiddenControlChars('a\u0000b')).toBe(true);
    expect(hasForbiddenControlChars('a\u0007b')).toBe(true);
    expect(hasForbiddenControlChars('a\nb\tc')).toBe(false);
  });
  it('keeps ZWJ and ZWNJ in stored text', () => {
    const s = 'क्‍ष';
    expect(toStoredText(s)).toContain('‍');
  });
  it('counts conjuncts as one visible character', () => {
    expect(graphemeLength('क्षत्रिय')).toBeLessThan('क्षत्रिय'.length);
  });
});

describe('search normaliser (index and query use the same function)', () => {
  it('removes danda and punctuation', () => {
    expect(searchNormalise('सच है।')).toBe('सच है');
    expect(searchNormalise('“कविता”, ॥ गीत ॥')).toBe('कविता गीत');
  });
  it('folds chandrabindu into anusvara', () => {
    expect(searchNormalise('हँसी')).toBe(searchNormalise('हंसी'));
  });
  it('folds nukta only in the secondary form', () => {
    const withNukta = 'ग़ज़ल';
    expect(searchNormalise(withNukta)).not.toBe(searchFolded(withNukta));
    expect(searchFolded(withNukta)).toBe(searchFolded('गजल'));
  });
  it('collapses whitespace and ignores case for Latin', () => {
    expect(searchNormalise('  UJAAS   उजास ')).toBe('ujaas उजास');
  });
});

describe('sanitisers', () => {
  it('strips every tag from plain text', () => {
    expect(stripHtml('<b>नमस्ते</b><script>alert(1)</script>')).toBe('नमस्ते');
  });
  it('keeps only allow-listed rich text and removes scripts and handlers', () => {
    const out = sanitizeRichText('<p onclick="x()">पाठ</p><script>alert(1)</script><a href="javascript:alert(1)">l</a>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('<p>पाठ</p>');
  });
});

describe('passwords, hashing and references', () => {
  it('enforces min length 12, common list and email-in-password', () => {
    expect(passwordProblems('short', 'a@b.org').map((p) => p.code)).toContain('too_short');
    expect(passwordProblems('password1234', 'a@b.org').map((p) => p.code)).toContain('common');
    expect(passwordProblems('prefix-sarita-99', 'sarita@b.org').map((p) => p.code)).toContain('contains_email');
    expect(passwordProblems('correct-horse-battery-9', 'a@b.org')).toEqual([]);
  });
  it('salted hashes are stable per salt and never contain the raw value', () => {
    const h = saltedHash('203.0.113.9', 'salt-salt-salt-salt');
    expect(h).toBe(saltedHash('203.0.113.9', 'salt-salt-salt-salt'));
    expect(h).not.toBe(saltedHash('203.0.113.9', 'other-salt-other-salt'));
    expect(h).not.toContain('203');
  });
  it('reference ids look like UJ-XXXXXXXX and are not sequential', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newReferenceId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^UJ-[A-HJ-NP-Z2-9]{8}$/);
  });
});

describe('T-PUB-04 workflow rules', () => {
  it('allows the documented content transitions per role', () => {
    expect(() => assertContentTransition('draft', 'in_review', 'content_manager')).not.toThrow();
    expect(() => assertContentTransition('in_review', 'approved', 'editor')).not.toThrow();
    expect(() => assertContentTransition('approved', 'published', 'editor_in_chief')).not.toThrow();
    expect(() => assertContentTransition('published', 'unpublished', 'site_admin')).not.toThrow();
    expect(() => assertContentTransition('archived', 'draft', 'editor')).not.toThrow();
  });
  it('denies a role that lacks permission with 403', () => {
    expect(() => assertContentTransition('in_review', 'approved', 'content_manager')).toThrowError(/Not allowed/);
    expect(() => assertContentTransition('approved', 'published', 'editor')).toThrowError(/Not allowed/);
  });
  it('rejects illegal transitions with state_transition_invalid (422)', () => {
    try {
      assertContentTransition('draft', 'published', 'site_admin');
      expect.unreachable();
    } catch (e) {
      expect((e as { status: number; code: string }).status).toBe(422);
      expect((e as { code: string }).code).toBe('state_transition_invalid');
    }
    expect(() => assertContentTransition('published', 'draft', 'site_admin')).toThrowError(/Cannot move/);
  });
  it('approved is not published: publishing needs every check', () => {
    expect(publishBlockers({})).toEqual(['lang_checked', 'proof_checked', 'final_approved', 'rights_note', 'credits']);
    expect(
      publishBlockers({ lang_checked: true, proof_checked: true, final_approved: true, rights_note: 'ok', credits: [{}], cover_alt: '' }),
    ).toEqual(['cover_alt']);
    expect(
      publishBlockers({ lang_checked: true, proof_checked: true, final_approved: true, rights_note: 'ok', credits: [{}], cover_alt: 'a' }),
    ).toEqual([]);
  });
  it('submissions: terminal states have no exits, approve and reject need the chief', () => {
    expect(() => assertSubmissionTransition('pending_review', 'under_review', 'editor')).not.toThrow();
    expect(() => assertSubmissionTransition('under_review', 'approved', 'editor')).toThrowError(/Not allowed/);
    expect(() => assertSubmissionTransition('under_review', 'approved', 'editor_in_chief')).not.toThrow();
    expect(() => assertSubmissionTransition('rejected', 'approved', 'site_admin')).toThrowError(/Cannot move/);
    expect(() => assertSubmissionTransition('approved', 'converted', 'editor')).not.toThrow();
    expect(() => assertSubmissionTransition('under_review', 'withdrawn', 'editor_in_chief')).not.toThrow();
  });
  it('the public filter only ever selects published items that are already due', () => {
    const now = new Date('2026-11-02T00:00:00Z');
    const f = publishedFilter(now);
    expect(f.status).toBe('published');
    expect(JSON.stringify(f.published_at)).toBe(JSON.stringify({ $lte: now }));
  });
});
