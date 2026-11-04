'use client';

import { useId, useState } from 'react';

interface Upcoming { readonly kind: string; readonly mode: string }

/** Upcoming / past switch for the activities page. Arrow keys move between the two tabs. */
export function EventsTabs({ upcoming }: { upcoming: readonly Upcoming[] }) {
  const [tab, setTab] = useState<'next' | 'past'>('next');
  const ids = useId();
  const tabs = [['next', 'आगामी आयोजन'], ['past', 'पिछले आयोजन']] as const;
  return (
    <>
      <div className="ev-head">
        <div>
          <p className="pg-kick-line">आयोजन</p>
          <h2 id="ev-list-h" className="pg-h2">गतिविधियाँ एवं घोषणाएँ</h2>
        </div>
        <div className="ev-tabs" role="tablist" aria-label="आयोजन चुनें">
          {tabs.map(([k, label]) => (
            <button
              key={k} type="button" role="tab" id={`${ids}-${k}`} className="pg-chip" aria-selected={tab === k} aria-controls={`${ids}-${k}-panel`}
              tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)}
              onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') setTab(tab === 'next' ? 'past' : 'next'); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div id={`${ids}-next-panel`} role="tabpanel" aria-labelledby={`${ids}-next`} hidden={tab !== 'next'}>
        <p className="pg-note ev-sample" role="note">ये नमूना कार्ड हैं — आयोजन घोषित होने पर इनकी जगह वास्तविक विवरण दिखेंगे।</p>
        <div className="pg-grid cols-3">
          {upcoming.map((e, i) => (
            <article key={i} className="pg-card ev-card">
              <div className="ev-card-top">
                <span className="ev-date" aria-hidden="true"><strong>[दि.]</strong><span>[माह]</span></span>
                <span className="ev-kind"><strong>{e.kind}</strong><span>{e.mode}</span></span>
                <span className="pg-tag">नमूना</span>
              </div>
              <div className="ev-card-body">
                <h3>[आयोजन का शीर्षक]</h3>
                <p>[आयोजन का संक्षिप्त विवरण — विषय, अतिथि रचनाकार और कार्यक्रम।]</p>
                <ul className="ev-facts"><li>[समय]</li><li>[स्थान / ऑनलाइन लिंक]</li></ul>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div id={`${ids}-past-panel`} role="tabpanel" aria-labelledby={`${ids}-past`} hidden={tab !== 'past'}>
        <div className="pg-empty">
          <p className="pg-empty-title">अभी पिछले आयोजनों का संग्रह खाली है</p>
          <p>आयोजन पूरे होने पर उनकी झलकियाँ, पढ़ी गई रचनाएँ और रिपोर्ट यहाँ संजोई जाएँगी।</p>
        </div>
      </div>
    </>
  );
}
