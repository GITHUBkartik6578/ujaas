'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LoadState, PageTitle, formatDateTime, useLoad, TYPE_LABEL } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';
import { SUB_STATUS } from '@/components/admin/submissionStatus';

interface Row { id: string; reference_id: string; title: string; display_name: string; creation_type: string; status: string; created_at: string; assigned_to: string | null }
interface Page { items: Row[]; page: number; page_size: number; total: number }

export default function SubmissionInboxPage() {
  const { request } = useAdmin();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), page_size: '30' });
  if (status) qs.set('status', status);
  if (applied) qs.set('q', applied);
  const list = useLoad(() => request<Page>(`/submissions?${qs}`), [status, applied, page]);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.page_size)) : 1;
  return (
    <>
      <PageTitle>Submissions</PageTitle>
      <p className="muted">Work sent in by writers. This information is private and never appears on the public site.</p>
      <form className="toolbar" role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(q.trim()); }}>
        <div className="field inline">
          <label htmlFor="s-status">Status</label>
          <select id="s-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(SUB_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field inline grow">
          <label htmlFor="s-q">Search</label>
          <input id="s-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference number, title or name" />
        </div>
        <button className="btn" type="submit">Apply</button>
      </form>
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      {d && d.items.length === 0 && <p className="state">No entries found.</p>}
      {d && d.items.length > 0 && (
        <>
          <table className="table">
            <thead><tr><th>Reference</th><th>Title</th><th>Writer</th><th>Status</th><th>Assigned to</th><th className="num">Received</th></tr></thead>
            <tbody>
              {d.items.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.reference_id}</code></td>
                  <td><Link href={`/admin/submissions/${s.id}`}>{s.title}</Link><p className="sub">{TYPE_LABEL[s.creation_type] ?? s.creation_type}</p></td>
                  <td>{s.display_name}</td>
                  <td><span className={`pill pill-${s.status === 'pending_review' ? 'in_review' : s.status === 'approved' ? 'approved' : s.status === 'under_review' ? 'draft' : 'unpublished'}`}>{SUB_STATUS[s.status] ?? s.status}</span></td>
                  <td>{s.assigned_to ?? '–'}</td>
                  <td className="num">{formatDateTime(s.created_at)}</td>
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
