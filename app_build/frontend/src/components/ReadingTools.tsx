'use client';

import { useEffect, useState } from 'react';

const SIZES = ['छोटा', 'सामान्य', 'बड़ा'] as const;

/**
 * Reading controls from the approved canvas: three text sizes and night reading. The choice is a per-reader
 * convenience kept in this browser; without script the sheet reads at the normal size.
 */
export function ReadingSheet({ verse, children }: { verse: boolean; children: React.ReactNode }) {
  const [size, setSize] = useState(1);
  const [night, setNight] = useState(false);
  useEffect(() => {
    try {
      const s = Number(localStorage.getItem('ujaas.read.size'));
      // Restoring a saved preference after hydration; the server always renders the default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (s >= 0 && s <= 2) setSize(s);
      setNight(localStorage.getItem('ujaas.read.night') === '1');
    } catch { /* storage unavailable: keep the defaults */ }
  }, []);
  const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
  return (
    <>
      <div className="rd-tools" role="group" aria-label="पढ़ने की सुविधाएँ">
        <button type="button" className="rd-tool" aria-label="अक्षर छोटे करें" disabled={size === 0} onClick={() => { setSize(size - 1); save('ujaas.read.size', String(size - 1)); }}>अ−</button>
        <span className="rd-size" aria-live="polite">{SIZES[size]}</span>
        <button type="button" className="rd-tool rd-tool-big" aria-label="अक्षर बड़े करें" disabled={size === 2} onClick={() => { setSize(size + 1); save('ujaas.read.size', String(size + 1)); }}>अ+</button>
        <span className="rd-sep" aria-hidden="true" />
        <button type="button" className="rd-tool rd-night-btn" aria-pressed={night} onClick={() => { setNight(!night); save('ujaas.read.night', night ? '0' : '1'); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          रात्रि पठन
        </button>
      </div>
      <div className={`rd-sheet rd-size-${size}${night ? ' rd-night' : ''}${verse ? ' rd-verse' : ' rd-prose'}`}>{children}</div>
    </>
  );
}

/** Copy the canonical link and print. */
export function ShareTools({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rd-share">
      <span className="rd-share-label">साझा करें:</span>
      <button
        type="button" className="pg-chip"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
        <span aria-live="polite">{copied ? 'लिंक कॉपी हो गया' : 'लिंक कॉपी करें'}</span>
      </button>
      <button type="button" className="pg-chip" onClick={() => window.print()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
        प्रिंट करें
      </button>
    </div>
  );
}
