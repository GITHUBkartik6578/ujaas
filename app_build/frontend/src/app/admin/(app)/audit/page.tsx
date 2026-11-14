'use client';

import { useState } from 'react';
import { LoadState, PageTitle, formatDateTime, useLoad } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

interface Row { id: string; created_at: string; actor: string; action: string; entity: string; entity_id: string | null; from: string | null; to: string | null; note: string | null }
interface Page { items: Row[]; page: number; page_size: number; total: number }

/** Read only: there is no edit or delete path for this log, in the screen or in the API. */
export default function AuditPage() {
  const { request } = useAdmin();
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), page_size: '30' });
  if (entity) qs.set('entity', entity);
  const log = useLoad(() => request<Page>(`/audit?${qs}`), [entity, page]);
  const d = log.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.page_size)) : 1;
  return (
    <>
      <PageTitle>Activity log</PageTitle>
      <div className="toolbar">
        <div className="field inline">
          <label htmlFor="a-entity">Entity</label>
          <select id="a-entity" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {['content', 'author', 'category', 'topic', 'collection', 'homepage', 'settings', 'media_asset', 'admin_user'].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
      <LoadState error={log.error} loading={log.loading} retry={log.reload} />
      {d && d.items.length === 0 && <p className="state">No entries found.</p>}
      {d && d.items.length > 0 && (
        <>
          <table className="table">
            <thead><tr><th className="num">Time</th><th>Action</th><th>Entity</th><th>Before</th><th>After</th><th>Note</th></tr></thead>
            <tbody>
              {d.items.map((r) => (
                <tr key={r.id}>
                  <td className="num">{formatDateTime(r.created_at)}</td>
                  <td><code>{r.action}</code><p className="sub">{r.actor === 'system' ? 'System' : r.actor.slice(-6)}</p></td>
                  <td>{r.entity}</td><td>{r.from ?? '–'}</td><td>{r.to ?? '–'}</td><td>{r.note ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <nav className="pager" aria-label="Pages">
            <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>{page} / {pages} · {d.total} total</span>
            <button className="btn" type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </>
      )}
    </>
  );
}
