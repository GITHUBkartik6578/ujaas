'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LoadState, PageTitle, StatusPill, STATUS_LABEL, formatDateTime, useLoad, TYPE_LABEL } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

interface Row {
  id: string; slug: string; title: string; status: string; content_type: string; category: string | null;
  scheduled_at: string | null; schedule_error: string | null; updated_at: string;
}
interface Page { items: Row[]; page: number; page_size: number; total: number }

export default function ContentListPage() {
  const { request } = useAdmin();
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), page_size: '20' });
  if (status) qs.set('status', status);
  if (type) qs.set('type', type);
  if (applied) qs.set('q', applied);
  const list = useLoad(() => request<Page>(`/contents?${qs}`), [status, type, applied, page]);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.page_size)) : 1;

  return (
    <>
      <PageTitle action={<Link className="btn btn-primary" href="/admin/content/new">New piece</Link>}>Content</PageTitle>
      <form
        className="toolbar"
        role="search"
        onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(q.trim()); }}
      >
        <div className="field inline">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field inline">
          <label htmlFor="f-type">Type</label>
          <select id="f-type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field inline grow">
          <label htmlFor="f-q">Search</label>
          <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or text" />
        </div>
        <button className="btn" type="submit">Apply</button>
      </form>
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      {d && d.items.length === 0 && (
        <p className="state">No content found. <Link href="/admin/content/new">Create a new piece</Link>.</p>
      )}
      {d && d.items.length > 0 && (
        <>
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Type</th><th>Category</th><th className="num">Last updated</th></tr>
            </thead>
            <tbody>
              {d.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/content/${r.id}`}>{r.title}</Link>
                    {r.schedule_error && <p className="field-error">Scheduled publishing failed: {r.schedule_error}</p>}
                  </td>
                  <td>
                    <StatusPill status={r.status} />
                    {r.status === 'scheduled' && <p className="sub">{formatDateTime(r.scheduled_at)}</p>}
                  </td>
                  <td>{TYPE_LABEL[r.content_type] ?? r.content_type}</td>
                  <td>{r.category ?? '–'}</td>
                  <td className="num">{formatDateTime(r.updated_at)}</td>
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
