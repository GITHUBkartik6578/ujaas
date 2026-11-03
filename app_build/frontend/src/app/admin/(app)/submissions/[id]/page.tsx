'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { can, useAdmin, type Role } from '@/components/admin/session';
import { Field, LoadState, PageTitle, ask, errorText, formatDateTime, useLoad, useToast } from '@/components/admin/ui';
import { TYPE_LABEL } from '@/lib/format';
import { SUB_STATUS } from '@/components/admin/submissionStatus';

interface Detail {
  id: string; reference_id: string; display_name: string; pen_name: string | null; email: string; title: string; creation_type: string;
  body: string; description: string | null; status: string; created_at: string;
  consent: { original: boolean; publication: boolean; privacy: boolean; version: string; at: string };
  assigned_to: { id: string; name: string | null } | null; converted_content_id: string | null;
  events: Array<{ at: string; actor: string; kind: string; from: string | null; to: string | null; note: string | null }>;
}
interface Staff { id: string; display_name: string; role: string }
interface Option { id: string; name: string }

/** Review actions per status. The server enforces the same table (editorial-workflow section 2.1); this only hides what a role cannot do. */
interface Act { to: string; label: string; min: 'editor' | 'chief'; note?: boolean; confirm?: string }
const ACTS: Record<string, Act[]> = {
  pending_review: [{ to: 'under_review', label: 'समीक्षा शुरू करें', min: 'editor' }, { to: 'withdrawn', label: 'वापस ली गई दर्ज करें', min: 'chief', note: true, confirm: 'यह प्रविष्टि वापस ली गई दर्ज होगी और आगे नहीं बढ़ेगी। जारी रखें?' }],
  under_review: [
    { to: 'revision_requested', label: 'संशोधन माँगें', min: 'editor', note: true },
    { to: 'approved', label: 'स्वीकृत करें', min: 'chief' },
    { to: 'rejected', label: 'अस्वीकृत करें', min: 'chief', note: true, confirm: 'अस्वीकृत प्रविष्टि आगे नहीं बढ़ सकती। जारी रखें?' },
    { to: 'withdrawn', label: 'वापस ली गई दर्ज करें', min: 'chief', note: true, confirm: 'यह प्रविष्टि वापस ली गई दर्ज होगी और आगे नहीं बढ़ेगी। जारी रखें?' },
  ],
  revision_requested: [{ to: 'pending_review', label: 'लेखक का उत्तर मिला', min: 'editor' }, { to: 'withdrawn', label: 'वापस ली गई दर्ज करें', min: 'chief', note: true, confirm: 'यह प्रविष्टि वापस ली गई दर्ज होगी और आगे नहीं बढ़ेगी। जारी रखें?' }],
  approved: [{ to: 'withdrawn', label: 'वापस ली गई दर्ज करें', min: 'chief', note: true, confirm: 'यह प्रविष्टि वापस ली गई दर्ज होगी और आगे नहीं बढ़ेगी। जारी रखें?' }],
};
const ok = (min: Act['min'], role: Role) => (min === 'editor' ? can.editorUp(role) : can.chiefUp(role));

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { request, user } = useAdmin();
  const [d, setD] = useState<Detail | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [cats, setCats] = useState<Option[]>([]);
  const [authors, setAuthors] = useState<Option[]>([]);
  const [note, setNote] = useState('');
  const [catId, setCatId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  const load = useLoad(async () => {
    const [detail, st, c, a] = await Promise.all([
      request<Detail>(`/submissions/${id}`), request<{ items: Staff[] }>('/staff'),
      request<{ items: Option[] }>('/categories'), request<{ items: Option[] }>('/authors?page_size=100'),
    ]);
    setD(detail); setStaff(st.items); setCats(c.items); setAuthors(a.items);
    return detail;
  }, [id]);

  const run = async (fn: () => Promise<Detail | void>, done: string) => {
    setBusy(true); setBanner('');
    try { const r = await fn(); if (r) setD(r); show(done); setNote(''); }
    catch (e) { setBanner(errorText(e)); }
    finally { setBusy(false); }
  };

  if (!d) return <LoadState error={load.error} loading={load.loading} retry={load.reload} />;
  const acts = (ACTS[d.status] ?? []).filter((a) => ok(a.min, user.role));
  const needsNote = acts.some((a) => a.note);

  return (
    <>
      <PageTitle action={<span className="pill pill-draft">{SUB_STATUS[d.status] ?? d.status}</span>}>प्रविष्टि <code>{d.reference_id}</code></PageTitle>
      {banner && <p className="banner" role="alert">{banner}</p>}
      <div className="editor-grid">
        <div className="editor-main">
          <section className="panel" aria-labelledby="work-h">
            <h2 id="work-h">{d.title}</h2>
            <p className="muted">{TYPE_LABEL[d.creation_type] ?? d.creation_type} · प्राप्त {formatDateTime(d.created_at)}</p>
            {d.description && <p>{d.description}</p>}
            <pre className="submission-body" lang="hi">{d.body}</pre>
          </section>
          <section className="panel" aria-labelledby="writer-h">
            <h2 id="writer-h">लेखक (निजी)</h2>
            <dl className="facts">
              <div><dt>नाम</dt><dd>{d.display_name}{d.pen_name && ` (उपनाम: ${d.pen_name})`}</dd></div>
              <div><dt>ईमेल</dt><dd>{d.email}</dd></div>
              <div>
                <dt>दर्ज सहमति (पाठ संस्करण {d.consent.version}, {formatDateTime(d.consent.at)})</dt>
                <dd>मूल रचना: {d.consent.original ? 'हाँ' : 'नहीं'} · प्रकाशन की अनुमति: {d.consent.publication ? 'हाँ' : 'नहीं'} · गोपनीयता की स्वीकृति: {d.consent.privacy ? 'हाँ' : 'नहीं'}</dd>
              </div>
            </dl>
          </section>
          <section className="panel" aria-labelledby="hist-h">
            <h2 id="hist-h">इतिहास</h2>
            <ol className="timeline">
              {d.events.map((e, i) => (
                <li key={i}>
                  <p>
                    <strong>{e.kind === 'submitted' ? 'प्राप्त हुई' : e.kind === 'note' ? 'निजी टिप्पणी' : e.kind === 'assign' ? 'सौंपा गया' : e.kind === 'convert' ? 'मसौदे में बदली' : `${SUB_STATUS[e.from ?? ''] ?? '–'} → ${SUB_STATUS[e.to ?? ''] ?? e.to}`}</strong>
                    <span className="sub"> · {e.actor === 'writer' ? 'लेखक' : e.actor === 'system' ? 'सिस्टम' : e.actor} · {formatDateTime(e.at)}</span>
                  </p>
                  {e.note && <p className="note">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="editor-side" aria-label="कार्य">
          <section className="panel">
            <h2>कार्य</h2>
            {toast}
            {needsNote && (
              <Field id="sub-note" label="टिप्पणी (संशोधन, अस्वीकृति या वापसी के लिए आवश्यक)">
                <textarea id="sub-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            )}
            <div className="stack">
              {acts.map((a) => (
                <button
                  key={a.to} type="button" className={a.to === 'approved' ? 'btn btn-primary' : 'btn'} disabled={busy}
                  onClick={() => {
                    if (a.confirm && !ask(a.confirm)) return;
                    void run(() => request<Detail>(`/submissions/${id}/transition`, { method: 'POST', body: { to: a.to, note: note || undefined } }), a.label);
                  }}
                >
                  {a.label}
                </button>
              ))}
              {acts.length === 0 && d.status !== 'approved' && <p className="muted">इस स्थिति में आपके लिए कोई कार्य नहीं।</p>}
            </div>
          </section>

          {d.status === 'approved' && can.editorUp(user.role) && (
            <section className="panel">
              <h2>मसौदे में बदलें</h2>
              <p className="muted">स्वीकृत का अर्थ प्रकाशित नहीं है। रचना मसौदे के रूप में बनेगी और सामान्य संपादकीय प्रक्रिया से गुज़रेगी।</p>
              <Field id="conv-cat" label="श्रेणी *">
                <select id="conv-cat" value={catId} onChange={(e) => setCatId(e.target.value)}>
                  <option value="">चुनें</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field id="conv-author" label="रचनाकार (वैकल्पिक)">
                <select id="conv-author" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
                  <option value="">बाद में जोड़ें</option>
                  {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <button
                type="button" className="btn btn-primary" disabled={busy || !catId}
                onClick={() => void run(async () => {
                  const r = await request<{ content_id: string }>(`/submissions/${id}/convert`, { method: 'POST', body: { category_id: catId, ...(authorId ? { author_id: authorId } : {}) } });
                  setD(await request<Detail>(`/submissions/${id}`));
                  setBanner('');
                  show(`मसौदा बना: /admin/content/${r.content_id}`);
                }, 'मसौदा बना')}
              >
                मसौदा बनाएँ
              </button>
            </section>
          )}
          {d.converted_content_id && (
            <section className="panel"><p><Link href={`/admin/content/${d.converted_content_id}`}>बना हुआ मसौदा खोलें</Link></p></section>
          )}

          <section className="panel">
            <h2>सौंपें</h2>
            <Field id="assign" label="संपादक">
              <select id="assign" value={d.assigned_to?.id ?? ''} onChange={(e) => void run(() => request<Detail>(`/submissions/${id}/assign`, { method: 'POST', body: { assigned_to: e.target.value || null } }), 'सहेजा गया')}>
                <option value="">किसी को नहीं</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              </select>
            </Field>
          </section>

          <section className="panel">
            <h2>निजी टिप्पणी जोड़ें</h2>
            <Field id="priv-note" label="टिप्पणी">
              <textarea id="priv-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <button type="button" className="btn" disabled={busy || !note.trim()} onClick={() => void run(() => request<Detail>(`/submissions/${id}/notes`, { method: 'POST', body: { note } }), 'टिप्पणी जुड़ी')}>जोड़ें</button>
          </section>
        </aside>
      </div>
    </>
  );
}
