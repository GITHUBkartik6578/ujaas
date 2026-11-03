'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TYPE_LABEL } from '@/lib/format';
import { can, useAdmin, type Role } from './session';
import { Field, PageTitle, StatusPill, ask, errorText, fieldErrors, formatDateTime, useToast } from './ui';

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
  draft: [{ to: 'in_review', label: 'समीक्षा के लिए भेजें', min: 'any' }],
  in_review: [
    { to: 'approved', label: 'स्वीकृत करें', min: 'editor' },
    { to: 'draft', label: 'वापस मसौदे में भेजें', min: 'editor', confirm: 'रचना वापस मसौदे में जाएगी और अंतिम स्वीकृति हट जाएगी। जारी रखें?' },
  ],
  approved: [
    { to: 'published', label: 'प्रकाशित करें', min: 'chief' },
    { to: 'scheduled', label: 'प्रकाशन का समय तय करें', min: 'editor', schedule: true },
    { to: 'draft', label: 'वापस मसौदे में भेजें', min: 'editor', confirm: 'रचना वापस मसौदे में जाएगी और अंतिम स्वीकृति हट जाएगी। जारी रखें?' },
  ],
  scheduled: [
    { to: 'published', label: 'अभी प्रकाशित करें', min: 'chief' },
    { to: 'approved', label: 'निर्धारित समय रद्द करें', min: 'editor', confirm: 'निर्धारित प्रकाशन रद्द होगा। जारी रखें?' },
  ],
  published: [
    { to: 'unpublished', label: 'अप्रकाशित करें', min: 'chief', confirm: 'रचना तुरंत सार्वजनिक साइट, खोज और साइटमैप से हट जाएगी। जारी रखें?' },
    { to: 'archived', label: 'संग्रहित करें', min: 'chief', confirm: 'रचना सार्वजनिक साइट से हट जाएगी और संग्रहित होगी। जारी रखें?' },
  ],
  unpublished: [
    { to: 'published', label: 'फिर से प्रकाशित करें', min: 'chief' },
    { to: 'archived', label: 'संग्रहित करें', min: 'chief', confirm: 'रचना संग्रहित होगी। जारी रखें?' },
    { to: 'draft', label: 'मसौदे में लौटाएँ', min: 'editor' },
  ],
  archived: [{ to: 'draft', label: 'मसौदे में लौटाएँ', min: 'editor' }],
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
      show('सहेजा गया');
    } catch (e) { setErrors(fieldErrors(e)); setBanner(errorText(e)); }
    finally { setBusy(false); }
  };

  const transition = async (a: Action) => {
    if (a.confirm && !ask(a.confirm)) return;
    if (dirty && !ask('पहले सहेजे न गए बदलाव इस कार्य में शामिल नहीं होंगे। जारी रखें?')) return;
    setBusy(true); setBanner('');
    try {
      const body: Record<string, unknown> = { to: a.to };
      if (a.schedule) {
        if (!scheduleAt) { setBanner('प्रकाशन का दिनांक और समय चुनें।'); setBusy(false); return; }
        body.scheduled_at = new Date(scheduleAt).toISOString();
      }
      const d = await request<Doc>(`/contents/${id}/transition`, { method: 'POST', body });
      setMeta((m) => (m ? { ...m, status: d.status, published_at: d.published_at, scheduled_at: d.scheduled_at, schedule_error: d.schedule_error } : m));
      setForm((f) => ({ ...f, final_approved: d.final_approved }));
      setSaved((s) => ({ ...s, final_approved: d.final_approved }));
      show(`स्थिति बदली: ${a.label}`);
    } catch (e) { setBanner(errorText(e)); }
    finally { setBusy(false); }
  };

  const preview = async () => {
    try {
      const r = await request<{ path: string }>(`/contents/${id}/preview-link`, { method: 'POST' });
      if (dirty) show('पूर्वावलोकन अंतिम सहेजे गए संस्करण का है');
      window.open(r.path, '_blank', 'noopener');
    } catch (e) { setBanner(errorText(e)); }
  };

  const restore = async (n: number) => {
    if (!ask(`संस्करण ${n} नया संस्करण बनकर लौटेगा और सभी जाँच/स्वीकृतियाँ हट जाएँगी। जारी रखें?`)) return;
    setBusy(true); setBanner('');
    try {
      apply(await request<Doc>(`/contents/${id}/revisions/${n}/restore`, { method: 'POST' }));
      setRevs((await request<{ items: Rev[] }>(`/contents/${id}/revisions`)).items);
      show('पुराना संस्करण लौटाया गया');
    } catch (e) { setBanner(errorText(e)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!ask('यह मसौदा हमेशा के लिए हटेगा। जारी रखें?')) return;
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

  if (loadFailed) return <p className="state" role="alert">रचना लोड नहीं हो सकी। <button className="btn" type="button" onClick={() => location.reload()}>फिर से प्रयास करें</button></p>;
  if (id && !meta) return <p className="state" aria-busy="true">लोड हो रहा है…</p>;

  const status = meta?.status ?? 'draft';
  const selectedMedia = media.find((m) => m.id === form.cover_media_id);
  const acts = (ACTIONS[status] ?? []).filter((a) => allowed(a.min, user.role));
  const canEdit = status === 'draft' || status === 'in_review' || can.editorUp(user.role);
  const err = (k: string) => errors[k];

  return (
    <>
      <PageTitle action={id ? <StatusPill status={status} /> : undefined}>{id ? 'रचना संपादित करें' : 'नई रचना'}</PageTitle>
      {banner && <p className="banner" role="alert">{banner}</p>}
      {meta?.schedule_error && <p className="banner" role="alert">निर्धारित प्रकाशन विफल रहा: {meta.schedule_error}</p>}
      {!canEdit && <p className="banner">इस स्थिति में केवल संपादक बदलाव कर सकते हैं।</p>}

      <div className="editor-grid">
        <form className="editor-main" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <Field id="title" label="शीर्षक" error={err('title')}>
            <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={160} required disabled={!canEdit} aria-describedby={err('title') ? 'title-err' : undefined} />
          </Field>
          <div className="row">
            <Field id="type" label="प्रकार" error={err('content_type')}>
              <select id="type" value={form.content_type} onChange={(e) => set('content_type', e.target.value)} disabled={!canEdit}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field id="format" label="पाठ का रूप" hint="कविता में हर पंक्ति-विराम बना रहता है।">
              <select id="format" value={form.body_format} onChange={(e) => set('body_format', e.target.value as 'verse' | 'prose')} disabled={!canEdit}>
                <option value="verse">पद्य (पंक्तियाँ)</option>
                <option value="prose">गद्य (अनुच्छेद)</option>
              </select>
            </Field>
            <Field id="category" label="श्रेणी" error={err('category_id')}>
              <select id="category" value={form.category_id} onChange={(e) => set('category_id', e.target.value)} required disabled={!canEdit}>
                <option value="">चुनें</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field id="excerpt" label="संक्षिप्त अंश" error={err('excerpt')} hint={`${[...form.excerpt].length} / 300`}>
            <textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} maxLength={300} required disabled={!canEdit} />
          </Field>
          <Field id="body" label="पूरा पाठ" error={err('body')} hint="चिपकाने पर फ़ॉर्मैटिंग हटा दी जाती है; केवल सादा पाठ रखा जाता है।">
            <textarea id="body" ref={bodyRef} className="body-input" rows={16} value={form.body} onChange={(e) => set('body', e.target.value)} onPaste={onPaste} required disabled={!canEdit} lang="hi" />
          </Field>

          <fieldset className="group">
            <legend>रचनाकार</legend>
            {err('credits') && <p className="field-error" role="alert">{err('credits')}</p>}
            {form.credits.length === 0 && <p className="muted">प्रकाशन के लिए कम से कम एक रचनाकार चाहिए।</p>}
            <ul className="credit-list">
              {form.credits.map((c, i) => (
                <li key={c.author_id}>
                  <span>{c.name ?? authors.find((a) => a.id === c.author_id)?.name ?? c.author_id}</span>
                  <select aria-label="भूमिका" value={c.role} disabled={!canEdit} onChange={(e) => set('credits', form.credits.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                    <option value="author">रचनाकार</option>
                    <option value="translator">अनुवादक</option>
                  </select>
                  <button type="button" className="btn" disabled={!canEdit} onClick={() => set('credits', form.credits.filter((_, j) => j !== i))}>हटाएँ</button>
                </li>
              ))}
            </ul>
            <div className="field inline">
              <label htmlFor="add-author">रचनाकार जोड़ें</label>
              <select id="add-author" value="" disabled={!canEdit} onChange={(e) => {
                const a = authors.find((x) => x.id === e.target.value);
                if (a && !form.credits.some((c) => c.author_id === a.id)) set('credits', [...form.credits, { author_id: a.id, role: 'author', name: a.name }]);
              }}>
                <option value="">चुनें</option>
                {authors.filter((a) => !form.credits.some((c) => c.author_id === a.id)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>आवरण चित्र</legend>
            <Field id="cover" label="चित्र चुनें" error={err('cover_media_id')}>
              <select id="cover" value={form.cover_media_id} onChange={(e) => set('cover_media_id', e.target.value)} disabled={!canEdit}>
                <option value="">कोई नहीं</option>
                {media.map((m) => <option key={m.id} value={m.id}>{m.alt_text || 'वैकल्पिक पाठ नहीं'} ({m.width}×{m.height})</option>)}
              </select>
            </Field>
            {selectedMedia && !selectedMedia.alt_text.trim() && (
              <p className="field-error" role="alert">इस चित्र का वैकल्पिक पाठ नहीं है; प्रकाशन से पहले चित्र पृष्ठ पर उसे भरें।</p>
            )}
          </fieldset>

          <fieldset className="group">
            <legend>स्रोत और अनुमति</legend>
            <Field id="source" label="स्रोत"><input id="source" value={form.source_note} onChange={(e) => set('source_note', e.target.value)} disabled={!canEdit} /></Field>
            <Field id="translator" label="अनुवाद का विवरण"><input id="translator" value={form.translator_note} onChange={(e) => set('translator_note', e.target.value)} disabled={!canEdit} /></Field>
            <Field id="rights" label="अनुमति नोट (निजी, सार्वजनिक नहीं दिखता)" error={err('rights_note')}>
              <textarea id="rights" rows={2} value={form.rights_note} onChange={(e) => set('rights_note', e.target.value)} disabled={!canEdit} />
            </Field>
          </fieldset>

          <fieldset className="group">
            <legend>खोज इंजन और पता</legend>
            <Field id="slug" label="पता (अंग्रेज़ी अक्षर, अंक और -)" error={err('slug')} hint="खाली छोड़ें तो अपने आप बनेगा। प्रकाशित रचना का पता बदलने पर पुराना पता नए पर भेज दिया जाता है।">
              <input id="slug" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={!canEdit} />
            </Field>
            <Field id="seo-title" label="खोज शीर्षक (वैकल्पिक)"><input id="seo-title" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} disabled={!canEdit} /></Field>
            <Field id="seo-desc" label="खोज विवरण (वैकल्पिक)"><textarea id="seo-desc" rows={2} value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} disabled={!canEdit} /></Field>
          </fieldset>

          {can.editorUp(user.role) && (
            <fieldset className="group">
              <legend>प्रकाशन से पहले की जाँचें</legend>
              <label className="check"><input type="checkbox" checked={form.lang_checked} onChange={(e) => set('lang_checked', e.target.checked)} /> भाषा जाँच पूरी</label>
              <label className="check"><input type="checkbox" checked={form.proof_checked} onChange={(e) => set('proof_checked', e.target.checked)} /> प्रूफ़ जाँच पूरी</label>
              {can.chiefUp(user.role) ? (
                <label className="check"><input type="checkbox" checked={form.final_approved} onChange={(e) => set('final_approved', e.target.checked)} /> अंतिम स्वीकृति</label>
              ) : (
                <p className="muted">अंतिम स्वीकृति प्रधान संपादक देते हैं: {form.final_approved ? 'दी गई' : 'अभी नहीं'}।</p>
              )}
            </fieldset>
          )}

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={busy || !canEdit || (!dirty && Boolean(id))}>सहेजें</button>
            {dirty && <span className="muted">सहेजे नहीं गए बदलाव हैं</span>}
            {toast}
          </div>
        </form>

        {id && (
          <aside className="editor-side" aria-label="कार्य और इतिहास">
            <section className="panel">
              <h2>कार्य</h2>
              <p className="muted">प्रकाशित: {formatDateTime(meta?.published_at)}</p>
              {acts.some((a) => a.schedule) && (
                <Field id="schedule" label="प्रकाशन का समय">
                  <input id="schedule" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                </Field>
              )}
              <div className="stack">
                {acts.map((a) => (
                  <button key={a.to + a.label} type="button" className={a.to === 'published' ? 'btn btn-primary' : 'btn'} disabled={busy} onClick={() => void transition(a)}>{a.label}</button>
                ))}
                {acts.length === 0 && <p className="muted">इस स्थिति में आपके लिए कोई कार्य नहीं।</p>}
                <button type="button" className="btn" onClick={() => void preview()}>पूर्वावलोकन खोलें</button>
              </div>
            </section>
            {can.editorUp(user.role) && (
              <section className="panel">
                <h2>संस्करण</h2>
                <ul className="rev-list">
                  {revs.map((r, i) => (
                    <li key={r.revision_no}>
                      <span>संस्करण {r.revision_no} · {formatDateTime(r.created_at)}</span>
                      {i > 0 && <button type="button" className="btn" disabled={busy || status === 'published' || status === 'scheduled'} onClick={() => void restore(r.revision_no)}>लौटाएँ</button>}
                      {i === 0 && <span className="muted">वर्तमान</span>}
                    </li>
                  ))}
                </ul>
                {(status === 'published' || status === 'scheduled') && <p className="muted">लौटाने से पहले रचना को अप्रकाशित करें।</p>}
              </section>
            )}
            {can.admin(user.role) && status === 'draft' && !meta?.published_at && (
              <section className="panel">
                <h2>हटाना</h2>
                <p className="muted">केवल कभी-प्रकाशित न हुआ मसौदा हटाया जा सकता है। यह वापस नहीं होगा।</p>
                <button type="button" className="btn btn-danger" onClick={() => void remove()}>मसौदा हटाएँ</button>
              </section>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
