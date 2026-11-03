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
      <PageTitle>गतिविधि लॉग</PageTitle>
      <div className="toolbar">
        <div className="field inline">
          <label htmlFor="a-entity">विषय</label>
          <select id="a-entity" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
            <option value="">सभी</option>
            {['content', 'author', 'category', 'topic', 'collection', 'homepage', 'settings', 'media_asset', 'admin_user'].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>
      <LoadState error={log.error} loading={log.loading} retry={log.reload} />
      {d && d.items.length === 0 && <p className="state">कोई प्रविष्टि नहीं मिली।</p>}
      {d && d.items.length > 0 && (
        <>
          <table className="table">
            <thead><tr><th className="num">समय</th><th>कार्य</th><th>विषय</th><th>पहले</th><th>बाद में</th><th>टिप्पणी</th></tr></thead>
            <tbody>
              {d.items.map((r) => (
                <tr key={r.id}>
                  <td className="num">{formatDateTime(r.created_at)}</td>
                  <td><code>{r.action}</code><p className="sub">{r.actor === 'system' ? 'सिस्टम' : r.actor.slice(-6)}</p></td>
                  <td>{r.entity}</td><td>{r.from ?? '–'}</td><td>{r.to ?? '–'}</td><td>{r.note ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <nav className="pager" aria-label="पृष्ठ">
            <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>पिछला</button>
            <span>{page} / {pages} · कुल {d.total}</span>
            <button className="btn" type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>अगला</button>
          </nav>
        </>
      )}
    </>
  );
}
