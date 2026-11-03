'use client';

import { use, useMemo, useState } from 'react';
import { can, useAdmin } from '@/components/admin/session';
import { Field, LoadState, PageTitle, StatusPill, ask, errorText, fieldErrors, useLoad, useToast } from '@/components/admin/ui';

interface Item { content_id: string; section_label: string | null; title: string | null; warning: string | null }
interface Issue {
  id: string; title: string; slug: string; issue_number: number; volume: string | null; period_label: string; publication_date: string;
  cover_media_id: string | null; editorial_intro: string | null; publication_details: string | null; status: string; show_in_archive: boolean; items: Item[];
}
interface Pub { id: string; title: string }
interface MediaOpt { id: string; alt_text: string; width: number; height: number }

/** The issue editor: details, cover, and the ordered contents with a section label for each. */
export default function IssueEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { request, user } = useAdmin();
  const [f, setF] = useState({ title: '', slug: '', issue_number: '', volume: '', period_label: '', publication_date: '', cover_media_id: '', editorial_intro: '', publication_details: '', show_in_archive: true });
  const [rows, setRows] = useState<Item[]>([]);
  const [status, setStatus] = useState('draft');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  const apply = (i: Issue) => {
    setF({ title: i.title, slug: i.slug, issue_number: String(i.issue_number), volume: i.volume ?? '', period_label: i.period_label, publication_date: i.publication_date.slice(0, 10),
      cover_media_id: i.cover_media_id ?? '', editorial_intro: i.editorial_intro ?? '', publication_details: i.publication_details ?? '', show_in_archive: i.show_in_archive });
    setRows(i.items); setStatus(i.status);
  };
  const load = useLoad(async () => { const i = await request<Issue>(`/issues/${id}`); apply(i); return i; }, [id]);
  const media = useLoad(() => request<{ items: MediaOpt[] }>('/media?page_size=100'), []);
  const published = useLoad(() => request<{ items: Pub[] }>('/contents?status=published&page_size=100'), []);
  const addable = useMemo(() => (published.data?.items ?? []).filter((p) => !rows.some((r) => r.content_id === p.id)), [published.data, rows]);
  const cover = media.data?.items.find((m) => m.id === f.cover_media_id);

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true); setBanner(''); setErrors({});
    try { await fn(); show(done); } catch (e) { setErrors(fieldErrors(e)); setBanner(errorText(e)); } finally { setBusy(false); }
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setRows(next);
  };
  const saveAll = () => run(async () => {
    await request(`/issues/${id}`, { method: 'PATCH', body: {
      title: f.title, slug: f.slug, issue_number: Number(f.issue_number), volume: f.volume || null, period_label: f.period_label,
      publication_date: f.publication_date, cover_media_id: f.cover_media_id || null, editorial_intro: f.editorial_intro || null,
      publication_details: f.publication_details || null, show_in_archive: f.show_in_archive,
    } });
    apply(await request<Issue>(`/issues/${id}/items`, { method: 'PUT', body: { items: rows.map((r) => ({ content_id: r.content_id, section_label: r.section_label || null })) } }));
  }, 'सहेजा गया');
  const transition = (to: string, confirm?: string) => {
    if (confirm && !ask(confirm)) return;
    void run(async () => { apply(await request<Issue>(`/issues/${id}/transition`, { method: 'POST', body: { to } })); }, 'स्थिति बदली');
  };

  if (!load.data) return <LoadState error={load.error} loading={load.loading} retry={load.reload} />;
  const chief = can.chiefUp(user.role);

  return (
    <>
      <PageTitle action={<StatusPill status={status === 'draft' ? 'draft' : status === 'published' ? 'published' : 'archived'} />}>अंक संपादित करें</PageTitle>
      {banner && <p className="banner" role="alert">{banner}</p>}
      <div className="editor-grid">
        <form className="editor-main" onSubmit={(e) => { e.preventDefault(); void saveAll(); }}>
          <Field id="t" label="अंक का नाम" error={errors.title}><input id="t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <div className="row">
            <Field id="n" label="अंक संख्या" error={errors.issue_number}><input id="n" type="number" min={1} value={f.issue_number} onChange={(e) => setF({ ...f, issue_number: e.target.value })} required /></Field>
            <Field id="v" label="खंड (वैकल्पिक)"><input id="v" value={f.volume} onChange={(e) => setF({ ...f, volume: e.target.value })} /></Field>
            <Field id="d" label="प्रकाशन तिथि" error={errors.publication_date}><input id="d" type="date" value={f.publication_date} onChange={(e) => setF({ ...f, publication_date: e.target.value })} required /></Field>
          </div>
          <Field id="p" label="अवधि" error={errors.period_label}><input id="p" value={f.period_label} onChange={(e) => setF({ ...f, period_label: e.target.value })} required /></Field>
          <Field id="cv" label="आवरण चित्र" error={errors.cover_media_id} hint="प्रकाशन के लिए वैकल्पिक पाठ वाला चित्र चाहिए।">
            <select id="cv" value={f.cover_media_id} onChange={(e) => setF({ ...f, cover_media_id: e.target.value })}>
              <option value="">कोई नहीं</option>
              {media.data?.items.map((m) => <option key={m.id} value={m.id}>{m.alt_text || 'वैकल्पिक पाठ नहीं'} ({m.width}×{m.height})</option>)}
            </select>
          </Field>
          {cover && !cover.alt_text.trim() && <p className="field-error" role="alert">इस चित्र का वैकल्पिक पाठ नहीं है; चित्र पृष्ठ पर उसे भरें।</p>}
          <Field id="intro" label="संपादकीय परिचय"><textarea id="intro" rows={5} value={f.editorial_intro} onChange={(e) => setF({ ...f, editorial_intro: e.target.value })} lang="hi" /></Field>
          <Field id="det" label="प्रकाशन विवरण (प्रकाशक, संपादक आदि)" hint="जो जानकारी दी जाएगी वही दिखेगी।"><textarea id="det" rows={3} value={f.publication_details} onChange={(e) => setF({ ...f, publication_details: e.target.value })} /></Field>
          <Field id="slug" label="पता" error={errors.slug}><input id="slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field>
          <label className="check"><input type="checkbox" checked={f.show_in_archive} onChange={(e) => setF({ ...f, show_in_archive: e.target.checked })} /> संग्रह (archive) सूची में दिखाएँ</label>

          <h2>इस अंक की रचनाएँ</h2>
          {errors.items && <p className="field-error" role="alert">{errors.items}</p>}
          {rows.length === 0 && <p className="muted">अभी कोई रचना नहीं जोड़ी गई।</p>}
          <ol className="ordered">
            {rows.map((r, i) => (
              <li key={r.content_id}>
                <span className="ordered-title">{r.title ?? '(हटाई गई रचना)'}{r.warning && <span className="sub"> · प्रकाशित नहीं है; सार्वजनिक पृष्ठ से हट जाएगी</span>}</span>
                <span className="ordered-actions">
                  <label className="visually-hidden" htmlFor={`sec-${i}`}>खंड का नाम</label>
                  <input id={`sec-${i}`} placeholder="खंड का नाम" value={r.section_label ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, section_label: e.target.value } : x)))} />
                  <button type="button" className="btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${r.title} ऊपर करें`}>ऊपर</button>
                  <button type="button" className="btn" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`${r.title} नीचे करें`}>नीचे</button>
                  <button type="button" className="btn" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`${r.title} हटाएँ`}>हटाएँ</button>
                </span>
              </li>
            ))}
          </ol>
          <Field id="add" label="प्रकाशित रचना जोड़ें">
            <select id="add" value="" onChange={(e) => { const p = addable.find((x) => x.id === e.target.value); if (p) setRows([...rows, { content_id: p.id, section_label: rows.at(-1)?.section_label ?? null, title: p.title, warning: null }]); }}>
              <option value="">चुनें</option>
              {addable.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>सहेजें</button>
            {toast}
          </div>
        </form>

        <aside className="editor-side" aria-label="कार्य">
          <section className="panel">
            <h2>कार्य</h2>
            <div className="stack">
              {status === 'draft' && chief && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => transition('published')}>अंक प्रकाशित करें</button>}
              {status === 'draft' && !chief && <p className="muted">प्रकाशन प्रधान संपादक करते हैं।</p>}
              {status === 'published' && chief && (
                <>
                  <button type="button" className="btn" disabled={busy} onClick={() => transition('draft', 'अंक सार्वजनिक साइट से हट जाएगा। जारी रखें?')}>मसौदे में लौटाएँ</button>
                  <button type="button" className="btn" disabled={busy} onClick={() => transition('archived', 'अंक सार्वजनिक साइट से हट जाएगा और संग्रहित होगा। जारी रखें?')}>संग्रहित करें</button>
                </>
              )}
              {status === 'archived' && <button type="button" className="btn" disabled={busy} onClick={() => transition('draft')}>मसौदे में लौटाएँ</button>}
            </div>
            <p className="muted">प्रकाशन के लिए: आवरण चित्र (वैकल्पिक पाठ सहित), अंक संख्या, तिथि और कम से कम एक प्रकाशित रचना।</p>
          </section>
        </aside>
      </div>
    </>
  );
}
