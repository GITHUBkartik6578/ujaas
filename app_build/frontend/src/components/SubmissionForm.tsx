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

  return (
    <form onSubmit={submit} className="form" noValidate={false}>
      {banner && <p className="form-banner" role="alert">{banner}</p>}

      <div className="field">
        <label htmlFor="display_name">आपका नाम *</label>
        <input id="display_name" value={f.display_name} onChange={(e) => set('display_name', e.target.value)} maxLength={80} required autoComplete="name" aria-describedby={err('display_name') ? 'display_name-e' : undefined} />
        {err('display_name') && <p className="form-error" id="display_name-e" role="alert">{err('display_name')}</p>}
      </div>
      <div className="field">
        <label htmlFor="pen_name">उपनाम (वैकल्पिक)</label>
        <input id="pen_name" value={f.pen_name} onChange={(e) => set('pen_name', e.target.value)} maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="email">ईमेल *</label>
        <input id="email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={254} required autoComplete="email" aria-describedby="email-h" />
        <p className="form-hint" id="email-h">यह सार्वजनिक नहीं होगा।</p>
        {err('email') && <p className="form-error" role="alert">{err('email')}</p>}
      </div>
      <div className="field">
        <label htmlFor="creation_type">रचना का प्रकार *</label>
        <select id="creation_type" value={f.creation_type} onChange={(e) => set('creation_type', e.target.value)} required>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {err('creation_type') && <p className="form-error" role="alert">{err('creation_type')}</p>}
      </div>
      <div className="field">
        <label htmlFor="title">रचना का शीर्षक *</label>
        <input id="title" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={160} required />
        {err('title') && <p className="form-error" role="alert">{err('title')}</p>}
      </div>
      <div className="field">
        <label htmlFor="description">संक्षिप्त परिचय (वैकल्पिक)</label>
        <textarea id="description" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={300} />
        <p className="form-hint">{[...f.description].length} / 300</p>
        {err('description') && <p className="form-error" role="alert">{err('description')}</p>}
      </div>
      <div className="field">
        <label htmlFor="body">आपकी रचना *</label>
        <textarea id="body" className="body-input" rows={14} value={f.body} onChange={(e) => set('body', e.target.value)} maxLength={config.body_max} required lang="hi" />
        <p className="form-hint">{bodyLen} / {config.body_max}</p>
        {err('body') && <p className="form-error" role="alert">{err('body')}</p>}
      </div>

      {/* Honeypot: off screen, not focusable, ignored by assistive technology. People never fill it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">इसे खाली छोड़ें</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <fieldset className="consents">
        <legend>सहमति (तीनों आवश्यक हैं)</legend>
        {(['original', 'publication', 'privacy'] as const).map((k) => (
          <div key={k} className="field">
            <label className="check">
              <input type="checkbox" checked={consents[k]} onChange={(e) => setConsents({ ...consents, [k]: e.target.checked })} required />
              <span>{config.consents[k]}</span>
            </label>
            {err(`consent_${k}`) && <p className="form-error" role="alert">इस सहमति के बिना रचना नहीं भेजी जा सकती।</p>}
          </div>
        ))}
      </fieldset>

      <p>
        <button className="button" type="submit" disabled={busy}>{busy ? 'भेजी जा रही है…' : 'रचना भेजें'}</button>
      </p>
    </form>
  );
}
