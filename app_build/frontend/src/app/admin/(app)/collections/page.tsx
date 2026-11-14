'use client';

import { useState } from 'react';
import { OrderedList, type OrderedItem } from '@/components/admin/OrderedList';
import { Field, LoadState, PageTitle, StatusPill, ask, errorText, useLoad, useToast } from '@/components/admin/ui';
import { can, useAdmin } from '@/components/admin/session';

interface Col { id: string; title: string; slug: string; description: string | null; status: string; items: Array<{ content_id: string; title: string | null; status: string | null; warning: string | null }> }
interface Pub { id: string; title: string }

export default function CollectionsAdminPage() {
  const { request, user } = useAdmin();
  const cols = useLoad(() => request<{ items: Col[] }>('/collections'), []);
  const published = useLoad(() => request<{ items: Pub[] }>('/contents?status=published&page_size=100'), []);
  const [selected, setSelected] = useState<Col | null>(null);
  const [order, setOrder] = useState<OrderedItem[]>([]);
  const [meta, setMeta] = useState({ title: '', description: '', status: 'draft' });
  const [banner, setBanner] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const { toast, show } = useToast();

  const open = (c: Col) => {
    setSelected(c); setBanner('');
    setMeta({ title: c.title, description: c.description ?? '', status: c.status });
    setOrder(c.items.map((i) => ({ id: i.content_id, title: i.title ?? '(deleted piece)', warning: i.warning })));
  };

  const remove = async () => {
    if (!selected || !ask(`Delete the collection "${selected.title}" permanently? The pieces in it are kept. This cannot be undone.`)) return;
    try { await request(`/collections/${selected.id}`, { method: 'DELETE' }); show('Deleted'); setSelected(null); cols.reload(); }
    catch (e) { setBanner(errorText(e)); }
  };

  const create = async () => {
    setBanner('');
    try {
      const c = await request<Col>('/collections', { method: 'POST', body: { title: newTitle } });
      setNewTitle(''); cols.reload(); open(c); show('Collection created');
    } catch (e) { setBanner(errorText(e)); }
  };
  const saveAll = async () => {
    if (!selected) return;
    setBanner('');
    try {
      await request(`/collections/${selected.id}`, { method: 'PATCH', body: { title: meta.title, description: meta.description || null, status: meta.status } });
      const updated = await request<Col>(`/collections/${selected.id}/items`, { method: 'PUT', body: { content_ids: order.map((o) => o.id) } });
      show('Saved'); cols.reload(); open(updated);
    } catch (e) { setBanner(errorText(e)); }
  };

  const addable = (published.data?.items ?? []).filter((p) => !order.some((o) => o.id === p.id));

  return (
    <>
      <PageTitle>Collections</PageTitle>
      {toast}
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <div className="field inline grow">
          <label htmlFor="new-col">New collection</label>
          <input id="new-col" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Collection name" required />
        </div>
        <button className="btn btn-primary" type="submit">Create</button>
      </form>
      <LoadState error={cols.error} loading={cols.loading} retry={cols.reload} />
      <div className="split">
        <div>
          {cols.data && cols.data.items.length === 0 && <p className="state">No collections yet.</p>}
          {cols.data && cols.data.items.length > 0 && (
            <table className="table">
              <thead><tr><th>Collection</th><th>Status</th><th className="num">Pieces</th></tr></thead>
              <tbody>
                {cols.data.items.map((c) => (
                  <tr key={c.id}>
                    <td><button type="button" className="linklike" onClick={() => open(c)}>{c.title}</button></td>
                    <td><StatusPill status={c.status === 'draft' ? 'draft' : c.status === 'published' ? 'published' : 'archived'} /></td>
                    <td className="num">{c.items.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected && (
          <section className="panel" aria-label="Collection details">
            <h2>Edit collection</h2>
            {banner && <p className="banner" role="alert">{banner}</p>}
            <Field id="c-title" label="Name"><input id="c-title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></Field>
            <Field id="c-desc" label="Description"><textarea id="c-desc" rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></Field>
            <Field id="c-status" label="Status">
              <select id="c-status" value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
              </select>
            </Field>
            <h3>Pieces (in order)</h3>
            <OrderedList items={order} onChange={setOrder} />
            <Field id="c-add" label="Add a published piece">
              <select id="c-add" value="" onChange={(e) => { const p = addable.find((x) => x.id === e.target.value); if (p) setOrder([...order, { id: p.id, title: p.title }]); }}>
                <option value="">Select</option>
                {addable.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={() => void saveAll()}>Save</button>
              <button type="button" className="btn" onClick={() => setSelected(null)}>Close</button>
              {can.admin(user.role) && <button type="button" className="btn btn-danger" onClick={() => void remove()}>Delete collection</button>}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
