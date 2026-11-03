'use client';

import { useEffect, useState } from 'react';
import { AdminApiError, type FieldError } from './session';

export const STATUS_LABEL: Record<string, string> = {
  draft: 'मसौदा', in_review: 'समीक्षा में', approved: 'स्वीकृत', scheduled: 'निर्धारित',
  published: 'प्रकाशित', unpublished: 'अप्रकाशित', archived: 'संग्रहित',
};

/** One status mark per row: a pale tint with dark text, never colour alone (the word is the signal). */
export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="page-title">
      <h1>{children}</h1>
      {action}
    </div>
  );
}

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="field-error" role="alert" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

const CODE_HI: Record<string, string> = {
  slug_taken: 'यह पता पहले से उपयोग में है', required: 'यह जाँच पूरी नहीं हुई', too_small: 'यह फ़ील्ड ज़रूरी है',
  invalid_type: 'मान सही नहीं है', unknown_category: 'श्रेणी नहीं मिली', unknown_author: 'रचनाकार नहीं मिला',
  unknown_media: 'चित्र नहीं मिला', not_published: 'केवल प्रकाशित रचनाएँ चुनी जा सकती हैं', in_use: 'यह उपयोग में है',
  alt_required: 'वैकल्पिक पाठ आवश्यक है', must_be_future: 'समय भविष्य का होना चाहिए', control_chars: 'पाठ में अमान्य अक्षर हैं',
};
export const BLOCKER_LABEL: Record<string, string> = {
  lang_checked: 'भाषा जाँच', proof_checked: 'प्रूफ़ जाँच', final_approved: 'अंतिम स्वीकृति',
  rights_note: 'अनुमति नोट', credits: 'कम से कम एक रचनाकार', cover_alt: 'आवरण का वैकल्पिक पाठ',
  cover: 'आवरण चित्र', items: 'कम से कम एक प्रकाशित रचना', issue_number: 'अंक संख्या', publication_date: 'प्रकाशन तिथि',
};

/** Field-level messages from a 422, keyed by field name. */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof AdminApiError) for (const f of err.fields as FieldError[]) out[f.field] = f.message_hi ?? CODE_HI[f.code] ?? 'मान सही नहीं है';
  return out;
}

export function errorText(err: unknown): string {
  if (err instanceof AdminApiError) {
    if (err.code === 'publish_blocked') return `प्रकाशन से पहले पूरा करें: ${err.fields.map((f) => BLOCKER_LABEL[f.field] ?? f.field).join(', ')}`;
    if (err.code === 'conflict') return err.messageHi ?? 'यह रचना किसी और ने बदल दी है। पृष्ठ फिर से खोलें।';
    if (err.status === 403) return 'इस कार्य की अनुमति आपके पास नहीं है।';
    if (err.status === 429) return 'बहुत अधिक अनुरोध, कुछ देर बाद फिर कोशिश करें।';
    return err.messageHi ?? 'कार्य पूरा नहीं हो सका। जानकारी जाँचें।';
  }
  return 'सेवा से संपर्क नहीं हो सका। फिर से प्रयास करें।';
}

/** A quiet confirmation that disappears by itself; announced to screen readers. */
export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);
  return { toast: msg ? <p className="toast" role="status">{msg}</p> : <p className="toast" role="status" />, show: setMsg };
}

export const ask = (message: string) => window.confirm(message);

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  return new Intl.DateTimeFormat('hi-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}

/** Loads data once and again on demand; shows honest loading, empty and error states. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    load()
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => { if (live) setError(e); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload: () => setTick((t) => t + 1), loading: data === null && error === null };
}

export function LoadState({ error, loading, retry }: { error: unknown; loading: boolean; retry: () => void }) {
  if (error) {
    return (
      <div className="state" role="alert">
        <p>{errorText(error)}</p>
        <button type="button" className="btn" onClick={retry}>फिर से प्रयास करें</button>
      </div>
    );
  }
  if (loading) return <p className="state" aria-busy="true">लोड हो रहा है…</p>;
  return null;
}
