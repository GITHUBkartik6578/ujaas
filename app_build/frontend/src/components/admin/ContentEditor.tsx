'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { can, useAdmin, type Role } from './session';
import { Field, PageTitle, StatusPill, ask, errorText, fieldErrors, formatDateTime, useToast, TYPE_LABEL } from './ui';

interface Credit { author_id: string; role: string; name: string | null }
interface Doc {
  id: string; slug: string; title: string; status: string; content_type: string; body: string; body_format: 'verse' | 'prose'; excerpt: string;
  category_id: string; credits: Credit[]; source_note: string | null; translator_note: string | null; rights_note: string | null;
  cover_media_id: string | null; seo_title: string | null; seo_description: string | null; lang_checked: boolean; proof_checked: boolean;
  final_approved: boolean; scheduled_at: string | null; published_at: string | null; schedule_error: string | null; revision_no: number;
}
interface Form {
  title: string; slug: string; content_type: string; body_format: 'verse' | 'prose'; category_id: string; excerpt: string; body: string;
  credits: Credit[]; source_note: string; translator_note: string; rights_note: string; cover_media_id: string;
  seo_title: string; seo_description: string; lang_checked: boolean; proof_checked: boolean; final_approved: boolean;
}
interface Option { id: string; name: string }
interface MediaOpt { id: string; alt_text: string; width: number; height: number; url: string }
interface Rev { revision_no: number; created_at: string; note: string | null; title: string | null }

const EMPTY: Form = {
  title: '', slug: '', content_type: 'kavita', body_format: 'verse', category_id: '', excerpt: '', body: '', credits: [],
  source_note: '', translator_note: '', rights_note: '', cover_media_id: '', seo_title: '', seo_description: '',
  lang_checked: false, proof_checked: false, final_approved: false,
};

const toForm = (d: Doc): Form => ({
  title: d.title, slug: d.slug, content_type: d.content_type, body_format: d.body_format, category_id: d.category_id, excerpt: d.excerpt,
  body: d.body, credits: d.credits, source_note: d.source_note ?? '', translator_note: d.translator_note ?? '', rights_note: d.rights_note ?? '',
  cover_media_id: d.cover_media_id ?? '', seo_title: d.seo_title ?? '', seo_description: d.seo_description ?? '',
  lang_checked: d.lang_checked, proof_checked: d.proof_checked, final_approved: d.final_approved,
});

/** Workflow buttons per status. The server enforces the same table; this only hides what a role cannot do. */
interface Action { to: string; label: string; min: 'any' | 'editor' | 'chief'; confirm?: string; schedule?: boolean }
const ACTIONS: Record<string, Action[]> = {
  draft: [{ to: 'in_review', label: 'Send for review', min: 'any' }],
  in_review: [
    { to: 'approved', label: 'Approve', min: 'editor' },
    { to: 'draft', label: 'Send back to draft', min: 'editor', confirm: 'The piece will go back to draft and its final approval will be removed. Continue?' },
  ],
  approved: [
    { to: 'published', label: 'Publish', min: 'chief' },
    { to: 'scheduled', label: 'Schedule publishing', min: 'editor', schedule: true },
    { to: 'draft', label: 'Send back to draft', min: 'editor', confirm: 'The piece will go back to draft and its final approval will be removed. Continue?' },
  ],
  scheduled: [
    { to: 'published', label: 'Publish now', min: 'chief' },
    { to: 'approved', label: 'Cancel schedule', min: 'editor', confirm: 'Scheduled publishing will be cancelled. Continue?' },
  ],
  published: [
    { to: 'unpublished', label: 'Unpublish', min: 'chief', confirm: 'The piece will be removed from the public site, search and sitemap immediately. Continue?' },
    { to: 'archived', label: 'Archive', min: 'chief', confirm: 'The piece will be removed from the public site and archived. Continue?' },
  ],
  unpublished: [
    { to: 'published', label: 'Republish', min: 'chief' },
    { to: 'archived', label: 'Archive', min: 'chief', confirm: 'The piece will be archived. Continue?' },
    { to: 'draft', label: 'Return to draft', min: 'editor' },
  ],
  archived: [{ to: 'draft', label: 'Return to draft', min: 'editor' }],
};
const allowed = (min: Action['min'], role: Role) => min === 'any' || (min === 'editor' ? can.editorUp(role) : can.chiefUp(role));

/** Removes formatting debris from pasted text: Windows line ends, zero-width spaces, non-breaking spaces, runs of blank lines. */
export function cleanPaste(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[​﻿]/g, '') // keep ZWJ and ZWNJ: they change how Devanagari shapes
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function ContentEditor({ id }: { id?: string }) {
  const { request, user, setDirty } = useAdmin();
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<Form>(EMPTY);
  const [meta, setMeta] = useState<Pick<Doc, 'status' | 'revision_no' | 'published_at' | 'scheduled_at' | 'schedule_error'> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [categories, setCategories] = useState<Option[]>([]);
  const [authors, setAuthors] = useState<Option[]>([]);
  const [media, setMedia] = useState<MediaOpt[]>([]);
  const [revs, setRevs] = useState<Rev[]>([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const { toast, show } = useToast();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty, setDirty]);

  const apply = (d: Doc) => {
    const f = toForm(d);
    setForm(f);
    setSaved(f);
    setMeta({ status: d.status, revision_no: d.revision_no, published_at: d.published_at, scheduled_at: d.scheduled_at, schedule_error: d.schedule_error });
  };

  useEffect(() => {
    (async () => {
      try {
        const [cats, auth, med] = await Promise.all([
          request<{ items: Option[] }>('/categories'),
          request<{ items: Option[] }>('/authors?page_size=100'),
          request<{ items: MediaOpt[] }>('/media?page_size=100'),
        ]);
        setCategories(cats.items);
        setAuthors(auth.items);
        setMedia(med.items);
        if (id) {
          apply(await request<Doc>(`/contents/${id}`));
          if (can.editorUp(user.role)) setRevs((await request<{ items: Rev[] }>(`/contents/${id}/revisions`)).items);
        }
      } catch { setLoadFailed(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const payload = () => {
    const p: Record<string, unknown> = {
      title: form.title, content_type: form.content_type, body: form.body, body_format: form.body_format, excerpt: form.excerpt,
      category_id: form.category_id, credits: form.credits.map((c) => ({ author_id: c.author_id, role: c.role })),
      source_note: form.source_note || null, translator_note: form.translator_note || null, rights_note: form.rights_note || null,
      cover_media_id: form.cover_media_id || null, seo_title: form.seo_title || null, seo_description: form.seo_description || null,
    };
    if (form.slug && form.slug !== saved.slug) p.slug = form.slug;
    if (can.editorUp(user.role)) { p.lang_checked = form.lang_checked; p.proof_checked = form.proof_checked; }
    if (can.chiefUp(user.role)) p.final_approved = form.final_approved;
    return p;
  };

  const save = async () => {
    setBusy(true); setErrors({}); setBanner('');
    try {
      if (!id) {
        const created = await request<Doc>('/contents', { method: 'POST', body: payload() });
        setSaved(toForm(created)); setDirty(false);
        router.replace(`/admin/content/${created.id}`);
        return;
      }
      const d = await request<Doc>(`/contents/${id}`, { method: 'PATCH', body: payload(), ifMatch: meta?.revision_no });
      apply(d);
      if (can.editorUp(user.role)) setRevs((await request<{ items: Rev[] }>(`/contents/${id}/revisions`)).items);
      show('Saved');
    } catch (e) { setErrors(fieldErrors(e)); setBanner(errorText(e)); }
    finally { setBusy(false); }
  };

  const transition = async (a: Action) => {
    if (a.confirm && !ask(a.confirm)) return;
    if (dirty && !ask('Unsaved changes will not be included in this action. Continue?')) return;
    setBusy(true); setBanner('');
    try {
      const body: Record<string, unknown> = { to: a.to };
      if (a.schedule) {
        if (!scheduleAt) { setBanner('Choose a publishing date and time.'); setBusy(false); return; }
        body.scheduled_at = new Date(scheduleAt).toISOString();
      }
      const d = await request<Doc>(`/contents/${id}/transition`, { method: 'POST', body });
      setMeta((m) => (m ? { ...m, status: d.status, published_at: d.published_at, scheduled_at: d.scheduled_at, schedule_error: d.schedule_error } : m));
      setForm((f) => ({ ...f, final_approved: d.final_approved }));
      setSaved((s) => ({ ...s, final_approved: d.final_approved }));
      show(`Status changed: ${a.label}`);
    } catch (e) { setBanner(errorText(e)); }
    finally { setBusy(false); }
  };

  const preview = async () => {
    try {
      const r = await request<{ path: string }>(`/contents/${id}/preview-link`, { method: 'POST' });
      if (dirty) show('The preview shows the last saved version');
      window.open(r.path, '_blank', 'noopener');
    } catch (e) { setBanner(errorText(e)); }
  };

  const restore = async (n: number) => {
    if (!ask(`Revision ${n} will be restored as a new revision and all checks/approvals will be cleared. Continue?`)) return;
    setBusy(true); setBanner('');
    try {
      apply(await request<Doc>(`/contents/${id}/revisions/${n}/restore`, { method: 'POST' }));
      setRevs((await request<{ items: Rev[] }>(`/contents/${id}/revisions`)).items);
      show('Earlier revision restored');
    } catch (e) { setBanner(errorText(e)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!ask('This draft will be deleted permanently. Continue?')) return;
    try { setDirty(false); await request(`/contents/${id}`, { method: 'DELETE' }); router.push('/admin/content'); }
    catch (e) { setBanner(errorText(e)); }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const text = cleanPaste(e.clipboardData.getData('text/plain'));
    const next = form.body.slice(0, el.selectionStart) + text + form.body.slice(el.selectionEnd);
    const caret = el.selectionStart + text.length;
    set('body', next);
    requestAnimationFrame(() => bodyRef.current?.setSelectionRange(caret, caret));
  };

  if (loadFailed) return <p className="state" role="alert">Could not load the piece. <button className="btn" type="button" onClick={() => location.reload()}>Try again</button></p>;
  if (id && !meta) return <p className="state" aria-busy="true">Loading…</p>;

  const status = meta?.status ?? 'draft';
  const selectedMedia = media.find((m) => m.id === form.cover_media_id);
  const acts = (ACTIONS[status] ?? []).filter((a) => allowed(a.min, user.role));
  const canEdit = status === 'draft' || status === 'in_review' || can.editorUp(user.role);
  const err = (k: string) => errors[k];

  return (
    <>
      <PageTitle action={id ? <StatusPill status={status} /> : undefined}>{id ? 'Edit piece' : 'New piece'}</PageTitle>
      {banner && <p className="banner" role="alert">{banner}</p>}
      {meta?.schedule_error && <p className="banner" role="alert">Scheduled publishing failed: {meta.schedule_error}</p>}
      {!canEdit && <p className="banner">In this status only editors can make changes.</p>}

      <div className="editor-grid">
        <form className="editor-main" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <Field id="title" label="Title" error={err('title')}>
            <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={160} required disabled={!canEdit} aria-describedby={err('title') ? 'title-err' : undefined} />
          </Field>
          <div className="row">
            <Field id="type" label="Type" error={err('content_type')}>
              <select id="type" value={form.content_type} onChange={(e) => set('content_type', e.target.value)} disabled={!canEdit}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field id="format" label="Text format" hint="Verse keeps every line break.">
              <select id="format" value={form.body_format} onChange={(e) => set('body_format', e.target.value as 'verse' | 'prose')} disabled={!canEdit}>
                <option value="verse">Verse (lines)</option>
                <option value="prose">Prose (paragraphs)</option>
              </select>
            </Field>
            <Field id="category" label="Category" error={err('category_id')}>
              <select id="category" value={form.category_id} onChange={(e) => set('category_id', e.target.value)} required disabled={!canEdit}>
                <option value="">Select</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field id="excerpt" label="Excerpt" error={err('excerpt')} hint={`${[...form.excerpt].length} / 300`}>
            <textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} maxLength={300} required disabled={!canEdit} />
          </Field>
          <Field id="body" label="Full text" error={err('body')} hint="Formatting is removed on paste; only plain text is kept.">
            <textarea id="body" ref={bodyRef} className="body-input" rows={16} value={form.body} onChange={(e) => set('body', e.target.value)} onPaste={onPaste} required disabled={!canEdit} lang="hi" />
          </Field>

          <fieldset className="group">
            <legend>Authors</legend>
            {err('credits') && <p className="field-error" role="alert">{err('credits')}</p>}
            {form.credits.length === 0 && <p className="muted">Publishing needs at least one author.</p>}
            <ul className="credit-list">
              {form.credits.map((c, i) => (
                <li key={c.author_id}>
                  <span>{c.name ?? authors.find((a) => a.id === c.author_id)?.name ?? c.author_id}</span>
                  <select aria-label="Role" value={c.role} disabled={!canEdit} onChange={(e) => set('credits', form.credits.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                    <option value="author">Author</option>
                    <option value="translator">Translator</option>
                  </select>
                  <button type="button" className="btn" disabled={!canEdit} onClick={() => set('credits', form.credits.filter((_, j) => j !== i))}>Remove</button>
                </li>
              ))}
            </ul>
            <div className="field inline">
              <label htmlFor="add-author">Add author</label>
              <select id="add-author" value="" disabled={!canEdit} onChange={(e) => {
                const a = authors.find((x) => x.id === e.target.value);
                if (a && !form.credits.some((c) => c.author_id === a.id)) set('credits', [...form.credits, { author_id: a.id, role: 'author', name: a.name }]);
              }}>
                <option value="">Select</option>
                {authors.filter((a) => !form.credits.some((c) => c.author_id === a.id)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>Cover image</legend>
            <Field id="cover" label="Choose image" error={err('cover_media_id')}>
              <select id="cover" value={form.cover_media_id} onChange={(e) => set('cover_media_id', e.target.value)} disabled={!canEdit}>
                <option value="">None</option>
                {media.map((m) => <option key={m.id} value={m.id}>{m.alt_text || 'No alt text'} ({m.width}×{m.height})</option>)}
              </select>
            </Field>
            {selectedMedia && !selectedMedia.alt_text.trim() && (
              <p className="field-error" role="alert">This image has no alt text; add it on the Media page before publishing.</p>
            )}
          </fieldset>

          <fieldset className="group">
            <legend>Source and permission</legend>
            <Field id="source" label="Source"><input id="source" value={form.source_note} onChange={(e) => set('source_note', e.target.value)} disabled={!canEdit} /></Field>
            <Field id="translator" label="Translation details"><input id="translator" value={form.translator_note} onChange={(e) => set('translator_note', e.target.value)} disabled={!canEdit} /></Field>
            <Field id="rights" label="Permission note (private, never shown publicly)" error={err('rights_note')}>
              <textarea id="rights" rows={2} value={form.rights_note} onChange={(e) => set('rights_note', e.target.value)} disabled={!canEdit} />
            </Field>
          </fieldset>

          <fieldset className="group">
            <legend>Search engines and URL</legend>
            <Field id="slug" label="Slug (English letters, digits and -)" error={err('slug')} hint="Leave empty to generate it automatically. Changing the slug of a published piece redirects the old URL to the new one.">
              <input id="slug" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={!canEdit} />
            </Field>
            <Field id="seo-title" label="SEO title (optional)"><input id="seo-title" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} disabled={!canEdit} /></Field>
            <Field id="seo-desc" label="SEO description (optional)"><textarea id="seo-desc" rows={2} value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} disabled={!canEdit} /></Field>
          </fieldset>

          {can.editorUp(user.role) && (
            <fieldset className="group">
              <legend>Pre-publication checks</legend>
              <label className="check"><input type="checkbox" checked={form.lang_checked} onChange={(e) => set('lang_checked', e.target.checked)} /> Language check done</label>
              <label className="check"><input type="checkbox" checked={form.proof_checked} onChange={(e) => set('proof_checked', e.target.checked)} /> Proofreading done</label>
              {can.chiefUp(user.role) ? (
                <label className="check"><input type="checkbox" checked={form.final_approved} onChange={(e) => set('final_approved', e.target.checked)} /> Final approval</label>
              ) : (
                <p className="muted">Final approval is given by the editor-in-chief: {form.final_approved ? 'given' : 'not yet'}.</p>
              )}
            </fieldset>
          )}

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={busy || !canEdit || (!dirty && Boolean(id))}>Save</button>
            {dirty && <span className="muted">You have unsaved changes</span>}
            {toast}
          </div>
        </form>

        {id && (
          <aside className="editor-side" aria-label="Actions and history">
            <section className="panel">
              <h2>Actions</h2>
              <p className="muted">Published: {formatDateTime(meta?.published_at)}</p>
              {acts.some((a) => a.schedule) && (
                <Field id="schedule" label="Publishing time">
                  <input id="schedule" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                </Field>
              )}
              <div className="stack">
                {acts.map((a) => (
                  <button key={a.to + a.label} type="button" className={a.to === 'published' ? 'btn btn-primary' : 'btn'} disabled={busy} onClick={() => void transition(a)}>{a.label}</button>
                ))}
                {acts.length === 0 && <p className="muted">No actions available to you in this status.</p>}
                <button type="button" className="btn" onClick={() => void preview()}>Open preview</button>
              </div>
            </section>
            {can.editorUp(user.role) && (
              <section className="panel">
                <h2>Revisions</h2>
                <ul className="rev-list">
                  {revs.map((r, i) => (
                    <li key={r.revision_no}>
                      <span>Revision {r.revision_no} · {formatDateTime(r.created_at)}</span>
                      {i > 0 && <button type="button" className="btn" disabled={busy || status === 'published' || status === 'scheduled'} onClick={() => void restore(r.revision_no)}>Restore</button>}
                      {i === 0 && <span className="muted">Current</span>}
                    </li>
                  ))}
                </ul>
                {(status === 'published' || status === 'scheduled') && <p className="muted">Unpublish the piece before restoring.</p>}
              </section>
            )}
            {can.admin(user.role) && status === 'draft' && !meta?.published_at && (
              <section className="panel">
                <h2>Delete</h2>
                <p className="muted">Only a draft that was never published can be deleted. This cannot be undone.</p>
                <button type="button" className="btn btn-danger" onClick={() => void remove()}>Delete draft</button>
              </section>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
