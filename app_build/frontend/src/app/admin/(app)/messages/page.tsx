'use client';

import { useState } from 'react';
import { LoadState, PageTitle, errorText, formatDateTime, useLoad, useToast } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

interface Msg { id: string; name: string; email: string; subject: string; message: string; status: 'new' | 'handled'; created_at: string }

/** Messages from the contact form. Private: names and email addresses are visible only here. */
export default function MessagesPage() {
  const { request } = useAdmin();
  const [status, setStatus] = useState('new');
  const [banner, setBanner] = useState('');
  const { toast, show } = useToast();
  const list = useLoad(() => request<{ items: Msg[]; total: number }>(`/messages?page_size=100${status ? `&status=${status}` : ''}`), [status]);
  return (
    <>
      <PageTitle>संदेश</PageTitle>
      {toast}
      {banner && <p className="banner" role="alert">{banner}</p>}
      <div className="toolbar">
        <div className="field inline">
          <label htmlFor="m-status">स्थिति</label>
          <select id="m-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="new">नए</option><option value="handled">निपटाए गए</option><option value="">सभी</option>
          </select>
        </div>
      </div>
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      {list.data && list.data.items.length === 0 && <p className="state">कोई संदेश नहीं।</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="messages">
          {list.data.items.map((m) => (
            <li key={m.id} className="panel">
              <h2>{m.subject}</h2>
              <p className="muted">{m.name} · {m.email} · {formatDateTime(m.created_at)}</p>
              <p className="submission-body">{m.message}</p>
              <button
                type="button" className="btn"
                onClick={async () => {
                  setBanner('');
                  try { await request(`/messages/${m.id}`, { method: 'PATCH', body: { status: m.status === 'new' ? 'handled' : 'new' } }); show('सहेजा गया'); list.reload(); }
                  catch (e) { setBanner(errorText(e)); }
                }}
              >
                {m.status === 'new' ? 'निपटाया हुआ चिह्नित करें' : 'नया चिह्नित करें'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
