'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, LoadState, PageTitle, StatusPill, errorText, fieldErrors, formatDateTime, useLoad } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

interface Row { id: string; title: string; slug: string; issue_number: number; period_label: string; status: string; publication_date: string; items_count: number }

/** The issue list. A new issue starts as a draft; the editor screen holds everything else. */
export default function IssuesPage() {
  const { request } = useAdmin();
  const router = useRouter();
  const list = useLoad(() => request<{ items: Row[] }>('/issues'), []);
  const [f, setF] = useState({ title: '', issue_number: '', period_label: '', publication_date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageTitle action={<button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>New issue</button>}>E-magazine issues</PageTitle>
      {open && (
        <form
          className="panel narrow"
          onSubmit={async (e) => {
            e.preventDefault(); setErrors({}); setBanner('');
            try {
              const i = await request<{ id: string }>('/issues', { method: 'POST', body: { title: f.title, issue_number: Number(f.issue_number), period_label: f.period_label, publication_date: f.publication_date } });
              router.push(`/admin/issues/${i.id}`);
            } catch (err) { setErrors(fieldErrors(err)); setBanner(errorText(err)); }
          }}
        >
          <h2>New issue</h2>
          {banner && <p className="banner" role="alert">{banner}</p>}
          <Field id="i-title" label="Issue title" error={errors.title}><input id="i-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <div className="row">
            <Field id="i-num" label="Issue number" error={errors.issue_number}><input id="i-num" type="number" min={1} value={f.issue_number} onChange={(e) => setF({ ...f, issue_number: e.target.value })} required /></Field>
            <Field id="i-date" label="Publication date" error={errors.publication_date}><input id="i-date" type="date" value={f.publication_date} onChange={(e) => setF({ ...f, publication_date: e.target.value })} required /></Field>
          </div>
          <Field id="i-period" label="Period (e.g. January–March)" error={errors.period_label}><input id="i-period" value={f.period_label} onChange={(e) => setF({ ...f, period_label: e.target.value })} required /></Field>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Create</button>
            <button className="btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      {list.data && list.data.items.length === 0 && <p className="state">No issues yet. Create the first one.</p>}
      {list.data && list.data.items.length > 0 && (
        <table className="table">
          <thead><tr><th className="num">Issue</th><th>Name</th><th>Period</th><th>Status</th><th className="num">Pieces</th><th className="num">Date</th></tr></thead>
          <tbody>
            {list.data.items.map((i) => (
              <tr key={i.id}>
                <td className="num">{i.issue_number}</td>
                <td><Link href={`/admin/issues/${i.id}`}>{i.title}</Link></td>
                <td>{i.period_label}</td>
                <td><StatusPill status={i.status === 'draft' ? 'draft' : i.status === 'published' ? 'published' : 'archived'} /></td>
                <td className="num">{i.items_count}</td>
                <td className="num">{formatDateTime(i.publication_date).split(',')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
