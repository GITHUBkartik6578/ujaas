'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { TYPE_LABEL } from '@/lib/format';

interface Config { version: string; consents: { original: string; publication: string; privacy: string }; body_max: number }
interface FieldErr { field: string; code: string; message_hi?: string }

const DRAFT_KEY = 'ujaas.submission.draft';
const BLANK = { display_name: '', pen_name: '', email: '', title: '', creation_type: 'kavita', description: '', body: '' };

/** Reads and writes the browser draft without ever failing the page (storage can be blocked or full). */
const store = {
  read(): typeof BLANK | null {
    try { const v = localStorage.getItem(DRAFT_KEY); return v ? { ...BLANK, ...JSON.parse(v) } : null; } catch { return null; }
  },
  write(v: typeof BLANK) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } },
};

/**
 * The writer form. Text fields are kept in this browser until the server confirms (so a network or server
 * failure never loses a poem). Consent boxes are never pre-ticked or remembered. The wording of the three
 * statements comes from the owner through the API; nothing here invents it.
 */
export function SubmissionForm({ config }: { config: Config }) {
  const router = useRouter();
  const [f, setF] = useState(BLANK);
  const [consents, setConsents] = useState({ original: false, publication: false, privacy: false });
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  const idemKey = useRef('');

  useEffect(() => {
    startedAt.current = Date.now();
    idemKey.current = crypto.randomUUID();
    const draft = store.read();
    // Browser storage cannot be read on the server, so the saved draft is restored once after the page loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setF(draft);
  }, []);

  const set = (k: keyof typeof BLANK, v: string) => {
    setF((prev) => { const next = { ...prev, [k]: v }; store.write(next); return next; });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setBanner('');
    try {
      const res = await fetch('/api/v1/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey.current },
        body: JSON.stringify({
          ...f, pen_name: f.pen_name || undefined, description: f.description || undefined,
          consent_original: consents.original, consent_publication: consents.publication, consent_privacy: consents.privacy,
          consent_text_version: config.version, form_started_at: startedAt.current, website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reference_id?: string; error?: { code?: string; fields?: FieldErr[]; message_hi?: string } };
      if (res.status === 201 && data.reference_id) {
        store.clear();
        try { sessionStorage.setItem('ujaas.submission.ref', data.reference_id); } catch { /* the confirmation page then sends the visitor back */ }
        router.push('/rachna-bhejein/prapti');
        return;
      }
      if (res.status === 422) {
        const map: Record<string, string> = {};
        for (const x of data.error?.fields ?? []) map[x.field] = x.message_hi ?? 'मान सही नहीं है';
        setErrors(map);
        setBanner(map.consent_text_version ?? 'कृपया चिह्नित क्षेत्र जाँचें।');
      } else if (res.status === 409) setBanner(data.error?.message_hi ?? 'यह रचना पहले ही प्राप्त हो चुकी है।');
      else if (res.status === 429) setBanner('बहुत अधिक प्रयास हुए हैं। कुछ देर बाद फिर कोशिश करें।');
      else setBanner('आपका लिखा हुआ इसी ब्राउज़र में सुरक्षित है। सेवा अभी उपलब्ध नहीं है, कृपया थोड़ी देर बाद फिर भेजें।');
    } catch {
      setBanner('आपका लिखा हुआ इसी ब्राउज़र में सुरक्षित है। नेटवर्क से संपर्क नहीं हो सका, कृपया फिर भेजें।');
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => errors[k];
  const bodyLen = [...f.body].length;

  const inv = (k: string) => (err(k) ? true : undefined);

  return (
    <form onSubmit={submit} className="pg-form" noValidate={false}>
      {banner && <p className="pg-banner" role="alert">{banner}</p>}

      <div className="pg-two">
        <div className="pg-field">
          <label htmlFor="display_name">आपका नाम *</label>
          <input id="display_name" className="pg-in" value={f.display_name} onChange={(e) => set('display_name', e.target.value)} maxLength={80} required autoComplete="name" aria-invalid={inv('display_name')} aria-describedby={err('display_name') ? 'display_name-e' : undefined} />
          {err('display_name') && <p className="pg-err" id="display_name-e" role="alert">{err('display_name')}</p>}
        </div>
        <div className="pg-field">
          <label htmlFor="pen_name">उपनाम (वैकल्पिक)</label>
          <input id="pen_name" className="pg-in" value={f.pen_name} onChange={(e) => set('pen_name', e.target.value)} maxLength={80} />
        </div>
      </div>
      <div className="pg-two">
        <div className="pg-field">
          <label htmlFor="email">ईमेल *</label>
          <input id="email" type="email" className="pg-in" value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={254} required autoComplete="email" aria-invalid={inv('email')} aria-describedby="email-h" />
          <p className="pg-hint" id="email-h">यह सार्वजनिक नहीं होगा।</p>
          {err('email') && <p className="pg-err" role="alert">{err('email')}</p>}
        </div>
        <div className="pg-field">
          <label htmlFor="creation_type">रचना का प्रकार *</label>
          <select id="creation_type" className="pg-in" value={f.creation_type} onChange={(e) => set('creation_type', e.target.value)} required aria-invalid={inv('creation_type')}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {err('creation_type') && <p className="pg-err" role="alert">{err('creation_type')}</p>}
        </div>
      </div>
      <div className="pg-field">
        <label htmlFor="title">रचना का शीर्षक *</label>
        <input id="title" className="pg-in" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={160} required aria-invalid={inv('title')} />
        {err('title') && <p className="pg-err" role="alert">{err('title')}</p>}
      </div>
      <div className="pg-field">
        <label htmlFor="description">संक्षिप्त परिचय (वैकल्पिक)</label>
        <textarea id="description" className="pg-in" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={300} aria-invalid={inv('description')} />
        <p className="pg-count">{[...f.description].length} / 300</p>
        {err('description') && <p className="pg-err" role="alert">{err('description')}</p>}
      </div>
      <div className="pg-field">
        <label htmlFor="body">आपकी रचना *</label>
        <textarea id="body" className="pg-in kr-body" rows={12} value={f.body} onChange={(e) => set('body', e.target.value)} maxLength={config.body_max} required lang="hi" placeholder="यहाँ अपनी रचना लिखें या चिपकाएँ…" aria-invalid={inv('body')} />
        <p className="pg-count">{bodyLen} / {config.body_max}</p>
        {err('body') && <p className="pg-err" role="alert">{err('body')}</p>}
      </div>

      {/* Honeypot: off screen, not focusable, ignored by assistive technology. People never fill it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">इसे खाली छोड़ें</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <fieldset className="kr-consents">
        <legend>सहमति (तीनों आवश्यक हैं)</legend>
        {(['original', 'publication', 'privacy'] as const).map((k) => (
          <div key={k}>
            <label className="pg-check">
              <input type="checkbox" checked={consents[k]} onChange={(e) => setConsents({ ...consents, [k]: e.target.checked })} required />
              <span>{config.consents[k]}</span>
            </label>
            {err(`consent_${k}`) && <p className="pg-err kr-consent-err" role="alert">इस सहमति के बिना रचना नहीं भेजी जा सकती।</p>}
          </div>
        ))}
      </fieldset>

      <div className="pg-submit">
        <button className="cta-btn cta-primary" type="submit" disabled={busy}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 2 2 10.5l7 2.6L19 5l-8.2 9.4V21l3.6-4.4L18 19z" /></svg>
          {busy ? 'भेजी जा रही है…' : 'रचना भेजें'}
        </button>
        <span className="pg-hint">आपका लिखा हुआ भेजे जाने तक इसी ब्राउज़र में सुरक्षित रहता है।</span>
      </div>
    </form>
  );
}
