'use client';

import { useState } from 'react';
import { can, useAdmin } from './session';
import { Field, LoadState, ask, errorText, fieldErrors, useLoad, useToast } from './ui';

interface Item { id: string; name: string; slug: string; description: string | null; sort_order: number; is_active: boolean }
const BLANK = { name: '', slug: '', description: '', sort_order: '0', is_active: true };

/** Categories and topics share one screen shape: a list, an inline form, and a guarded delete. */
export function TaxonomyManager({ path, heading, noun }: { path: 'categories' | 'topics'; heading: string; noun: string }) {
  const { request, user } = useAdmin();
  const list = useLoad(() => request<{ items: Item[] }>(`/${path}`), [path]);
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const { toast, show } = useToast();

  const edit = (it: Item | null) => {
    setEditing(it?.id ?? 'new'); setErrors({}); setBanner('');
    setF(it ? { name: it.name, slug: it.slug, description: it.description ?? '', sort_order: String(it.sort_order), is_active: it.is_active } : BLANK);
  };
  const save = async () => {
    setErrors({}); setBanner('');
    const body: Record<string, unknown> = { name: f.name, description: f.description || null, sort_order: Number(f.sort_order) || 0, is_active: f.is_active };
    if (f.slug) body.slug = f.slug;
    try {
      await request(editing === 'new' ? `/${path}` : `/${path}/${editing}`, { method: editing === 'new' ? 'POST' : 'PATCH', body });
      show('सहेजा गया'); setEditing(null); list.reload();
    } catch (e) { setErrors(fieldErrors(e)); setBanner(errorText(e)); }
  };
  const remove = async (it: Item) => {
    if (!ask(`“${it.name}” हटाएँ? यह वापस नहीं होगा।`)) return;
    try { await request(`/${path}/${it.id}`, { method: 'DELETE' }); show('हटाया गया'); list.reload(); }
    catch (e) { setBanner(errorText(e)); }
  };

  return (
    <section aria-labelledby={`${path}-h`}>
      <div className="page-title">
        <h2 id={`${path}-h`}>{heading}</h2>
        <button type="button" className="btn" onClick={() => edit(null)}>नया {noun}</button>
      </div>
      {toast}
      {banner && !editing && <p className="banner" role="alert">{banner}</p>}
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      <div className="split">
        <div>
          {list.data && list.data.items.length === 0 && <p className="state">अभी कोई {noun} नहीं है।</p>}
          {list.data && list.data.items.length > 0 && (
            <table className="table">
              <thead><tr><th>नाम</th><th>पता</th><th className="num">क्रम</th><th>स्थिति</th><th><span className="visually-hidden">कार्य</span></th></tr></thead>
              <tbody>
                {list.data.items.map((it) => (
                  <tr key={it.id}>
                    <td><button type="button" className="linklike" onClick={() => edit(it)}>{it.name}</button></td>
                    <td><code>{it.slug}</code></td>
                    <td className="num">{it.sort_order}</td>
                    <td>{it.is_active ? 'चालू' : 'बंद'}</td>
                    <td>{can.admin(user.role) && <button type="button" className="btn btn-danger" onClick={() => void remove(it)}>हटाएँ</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {editing && (
          <form className="panel" onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label={`${noun} का विवरण`}>
            <h3>{editing === 'new' ? `नया ${noun}` : `${noun} संपादित करें`}</h3>
            {banner && <p className="banner" role="alert">{banner}</p>}
            <Field id={`${path}-name`} label="नाम" error={errors.name}><input id={`${path}-name`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field id={`${path}-slug`} label="पता (वैकल्पिक)" error={errors.slug}><input id={`${path}-slug`} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field>
            <Field id={`${path}-desc`} label="विवरण"><textarea id={`${path}-desc`} rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <Field id={`${path}-order`} label="क्रम"><input id={`${path}-order`} type="number" min={0} value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> चालू (साइट पर दिखे)</label>
            <div className="actions">
              <button className="btn btn-primary" type="submit">सहेजें</button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>रद्द करें</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
