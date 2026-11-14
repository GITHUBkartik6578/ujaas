'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { can, useAdmin, type Role } from '@/components/admin/session';
import { Field, LoadState, PageTitle, ask, errorText, formatDateTime, useLoad, useToast, TYPE_LABEL } from '@/components/admin/ui';
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
  pending_review: [{ to: 'under_review', label: 'Start review', min: 'editor' }, { to: 'withdrawn', label: 'Mark as withdrawn', min: 'chief', note: true, confirm: 'This submission will be marked as withdrawn and will not move forward. Continue?' }],
  under_review: [
    { to: 'revision_requested', label: 'Request revision', min: 'editor', note: true },
    { to: 'approved', label: 'Approve', min: 'chief' },
    { to: 'rejected', label: 'Reject', min: 'chief', note: true, confirm: 'A rejected submission cannot move forward. Continue?' },
    { to: 'withdrawn', label: 'Mark as withdrawn', min: 'chief', note: true, confirm: 'This submission will be marked as withdrawn and will not move forward. Continue?' },
  ],
  revision_requested: [{ to: 'pending_review', label: 'Writer has responded', min: 'editor' }, { to: 'withdrawn', label: 'Mark as withdrawn', min: 'chief', note: true, confirm: 'This submission will be marked as withdrawn and will not move forward. Continue?' }],
  approved: [{ to: 'withdrawn', label: 'Mark as withdrawn', min: 'chief', note: true, confirm: 'This submission will be marked as withdrawn and will not move forward. Continue?' }],
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
      <PageTitle action={<span className="pill pill-draft">{SUB_STATUS[d.status] ?? d.status}</span>}>Submission <code>{d.reference_id}</code></PageTitle>
      {banner && <p className="banner" role="alert">{banner}</p>}
      <div className="editor-grid">
        <div className="editor-main">
          <section className="panel" aria-labelledby="work-h">
            <h2 id="work-h">{d.title}</h2>
            <p className="muted">{TYPE_LABEL[d.creation_type] ?? d.creation_type} · received {formatDateTime(d.created_at)}</p>
            {d.description && <p>{d.description}</p>}
            <pre className="submission-body" lang="hi">{d.body}</pre>
          </section>
          <section className="panel" aria-labelledby="writer-h">
            <h2 id="writer-h">Writer (private)</h2>
            <dl className="facts">
              <div><dt>Name</dt><dd>{d.display_name}{d.pen_name && ` (pen name: ${d.pen_name})`}</dd></div>
              <div><dt>Email</dt><dd>{d.email}</dd></div>
              <div>
                <dt>Recorded consent (text version {d.consent.version}, {formatDateTime(d.consent.at)})</dt>
                <dd>Original work: {d.consent.original ? 'Yes' : 'No'} · Permission to publish: {d.consent.publication ? 'Yes' : 'No'} · Privacy accepted: {d.consent.privacy ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </section>
          <section className="panel" aria-labelledby="hist-h">
            <h2 id="hist-h">History</h2>
            <ol className="timeline">
              {d.events.map((e, i) => (
                <li key={i}>
                  <p>
                    <strong>{e.kind === 'submitted' ? 'Received' : e.kind === 'note' ? 'Private note' : e.kind === 'assign' ? 'Assigned' : e.kind === 'convert' ? 'Converted to draft' : `${SUB_STATUS[e.from ?? ''] ?? '–'} → ${SUB_STATUS[e.to ?? ''] ?? e.to}`}</strong>
                    <span className="sub"> · {e.actor === 'writer' ? 'Writer' : e.actor === 'system' ? 'System' : e.actor} · {formatDateTime(e.at)}</span>
                  </p>
                  {e.note && <p className="note">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="editor-side" aria-label="Actions">
          <section className="panel">
            <h2>Actions</h2>
            {toast}
            {needsNote && (
              <Field id="sub-note" label="Note (required for revision, rejection or withdrawal)">
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
              {acts.length === 0 && d.status !== 'approved' && <p className="muted">No actions available to you in this status.</p>}
            </div>
          </section>

          {d.status === 'approved' && can.editorUp(user.role) && (
            <section className="panel">
              <h2>Convert to draft</h2>
              <p className="muted">Approved does not mean published. The piece is created as a draft and goes through the normal editorial process.</p>
              <Field id="conv-cat" label="Category *">
                <select id="conv-cat" value={catId} onChange={(e) => setCatId(e.target.value)}>
                  <option value="">Select</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field id="conv-author" label="Author (optional)">
                <select id="conv-author" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
                  <option value="">Add later</option>
                  {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <button
                type="button" className="btn btn-primary" disabled={busy || !catId}
                onClick={() => void run(async () => {
                  const r = await request<{ content_id: string }>(`/submissions/${id}/convert`, { method: 'POST', body: { category_id: catId, ...(authorId ? { author_id: authorId } : {}) } });
                  setD(await request<Detail>(`/submissions/${id}`));
                  setBanner('');
                  show(`Draft created: /admin/content/${r.content_id}`);
                }, 'Draft created')}
              >
                Create draft
              </button>
            </section>
          )}
          {d.converted_content_id && (
            <section className="panel"><p><Link href={`/admin/content/${d.converted_content_id}`}>Open the created draft</Link></p></section>
          )}

          <section className="panel">
            <h2>Assign</h2>
            <Field id="assign" label="Editor">
              <select id="assign" value={d.assigned_to?.id ?? ''} onChange={(e) => void run(() => request<Detail>(`/submissions/${id}/assign`, { method: 'POST', body: { assigned_to: e.target.value || null } }), 'Saved')}>
                <option value="">Nobody</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              </select>
            </Field>
          </section>

          <section className="panel">
            <h2>Add a private note</h2>
            <Field id="priv-note" label="Note">
              <textarea id="priv-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <button type="button" className="btn" disabled={busy || !note.trim()} onClick={() => void run(() => request<Detail>(`/submissions/${id}/notes`, { method: 'POST', body: { note } }), 'Note added')}>Add</button>
          </section>
        </aside>
      </div>
    </>
  );
}
