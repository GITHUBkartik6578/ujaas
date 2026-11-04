'use client';

import { useEffect, useRef, useState } from 'react';

interface FieldErr { field: string; code: string; message_hi?: string }
const BLANK = { name: '', email: '', subject: '', message: '' };

/** The contact form: four fields, a hidden honeypot, no attachments, no map. Text stays until the server confirms. */
export function ContactForm() {
  const [f, setF] = useState(BLANK);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  useEffect(() => { startedAt.current = Date.now(); }, []);

  if (sent) {
    return (
      <div className="ks-sent" role="status">
        <span className="kg-badge ks-sent-mark" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <h2 className="pg-empty-title">संदेश भेजा गया</h2>
        <p>धन्यवाद। हम जल्द उत्तर देने का प्रयास करेंगे।</p>
        <button type="button" className="cta-btn cta-outline" onClick={() => { setF(BLANK); setSent(false); }}>नया संदेश</button>
      </div>
    );
  }
  const err = (k: string) => errors[k];
  return (
    <form
      className="pg-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErrors({}); setBanner('');
        try {
          const res = await fetch('/api/v1/contact', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...f, form_started_at: startedAt.current, website }),
          });
          if (res.status === 201) { setSent(true); return; }
          const data = (await res.json().catch(() => ({}))) as { error?: { fields?: FieldErr[] } };
          if (res.status === 422) {
            const map: Record<string, string> = {};
            for (const x of data.error?.fields ?? []) map[x.field] = x.message_hi ?? 'मान सही नहीं है';
            setErrors(map); setBanner('कृपया चिह्नित क्षेत्र जाँचें।');
          } else if (res.status === 429) setBanner('बहुत अधिक संदेश भेजे गए हैं। कुछ देर बाद फिर कोशिश करें।');
          else setBanner('संदेश नहीं जा सका। आपका लिखा हुआ यहीं है; थोड़ी देर बाद फिर भेजें।');
        } catch {
          setBanner('नेटवर्क से संपर्क नहीं हो सका। आपका लिखा हुआ यहीं है; फिर भेजें।');
        } finally { setBusy(false); }
      }}
    >
      {banner && <p className="pg-banner" role="alert">{banner}</p>}
      <div className="pg-two">
        <div className="pg-field">
          <label htmlFor="c-name">नाम *</label>
          <input id="c-name" className="pg-in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} required autoComplete="name" aria-invalid={err('name') ? true : undefined} />
          {err('name') && <p className="pg-err" role="alert">{err('name')}</p>}
        </div>
        <div className="pg-field">
          <label htmlFor="c-email">ईमेल *</label>
          <input id="c-email" type="email" className="pg-in" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={254} required autoComplete="email" aria-invalid={err('email') ? true : undefined} />
          {err('email') && <p className="pg-err" role="alert">{err('email')}</p>}
        </div>
      </div>
      <div className="pg-field">
        <label htmlFor="c-subject">विषय *</label>
        <input id="c-subject" className="pg-in" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={120} required aria-invalid={err('subject') ? true : undefined} />
        {err('subject') && <p className="pg-err" role="alert">{err('subject')}</p>}
      </div>
      <div className="pg-field">
        <label htmlFor="c-message">आपका संदेश *</label>
        <textarea id="c-message" className="pg-in" rows={7} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={1000} required lang="hi" aria-invalid={err('message') ? true : undefined} />
        <p className="pg-count">{[...f.message].length} / 1000</p>
        {err('message') && <p className="pg-err" role="alert">{err('message')}</p>}
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="c-website">इसे खाली छोड़ें</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div className="pg-submit">
        <button className="cta-btn cta-primary" type="submit" disabled={busy}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 2 2 10.5l7 2.6L19 5l-8.2 9.4V21l3.6-4.4L18 19z" /></svg>
          {busy ? 'भेजा जा रहा है…' : 'संदेश भेजें'}
        </button>
        <span className="pg-hint">आपका ईमेल केवल उत्तर देने के लिए है।</span>
      </div>
    </form>
  );
}
