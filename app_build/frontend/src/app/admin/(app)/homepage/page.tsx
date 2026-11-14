'use client';

import { useState } from 'react';
import { OrderedList, type OrderedItem } from '@/components/admin/OrderedList';
import { Field, LoadState, PageTitle, errorText, useLoad, useToast } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

interface Row { id: string; title: string }
interface Data { featured: Row[]; candidates: Row[] }

/** The editor's picks shown on the home page. Only published items can be chosen; at most six. */
export default function HomepageManagerPage() {
  const { request } = useAdmin();
  const [order, setOrder] = useState<OrderedItem[]>([]);
  const [banner, setBanner] = useState('');
  const { toast, show } = useToast();
  const data = useLoad(async () => {
    const d = await request<Data>('/homepage');
    setOrder(d.featured.map((f) => ({ id: f.id, title: f.title })));
    return d;
  }, []);
  const addable = (data.data?.candidates ?? []).filter((c) => !order.some((o) => o.id === c.id));

  return (
    <>
      <PageTitle>Homepage picks</PageTitle>
      {toast}
      {banner && <p className="banner" role="alert">{banner}</p>}
      <LoadState error={data.error} loading={data.loading} retry={data.reload} />
      {data.data && (
        <section className="panel narrow" aria-label="Featured pieces">
          <h2>Featured pieces (up to 6)</h2>
          <p className="muted">When empty, the homepage shows the latest pieces.</p>
          <OrderedList items={order} onChange={setOrder} />
          <Field id="h-add" label="Add a published piece">
            <select id="h-add" value="" disabled={order.length >= 6} onChange={(e) => { const c = addable.find((x) => x.id === e.target.value); if (c) setOrder([...order, { id: c.id, title: c.title }]); }}>
              <option value="">Select</option>
              {addable.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <div className="actions">
            <button
              type="button" className="btn btn-primary"
              onClick={async () => {
                setBanner('');
                try { await request('/homepage', { method: 'PUT', body: { featured_ids: order.map((o) => o.id) } }); show('Saved'); }
                catch (e) { setBanner(errorText(e)); }
              }}
            >
              Save
            </button>
          </div>
        </section>
      )}
    </>
  );
}
