'use client';

import Image from 'next/image';
import { useState } from 'react';
import { can, useAdmin } from '@/components/admin/session';
import { Field, LoadState, PageTitle, ask, errorText, useLoad, useToast } from '@/components/admin/ui';

interface M { id: string; url: string; width: number; height: number; bytes: number; alt_text: string; credit: string | null; is_public: boolean }

/** Upload keeps the page state on failure and says what went wrong (size, type, network). Alt text is required before public use. */
export default function MediaPage() {
  const { request, user } = useAdmin();
  const list = useLoad(() => request<{ items: M[]; total: number }>('/media?page_size=60'), []);
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, { alt_text: string; credit: string }>>({});
  const { toast, show } = useToast();

  const upload = async (file: File) => {
    setBanner(''); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await request('/media', { method: 'POST', formData: fd });
      show('चित्र जोड़ा गया। अब वैकल्पिक पाठ भरें।'); list.reload();
    } catch (e) { setBanner(errorText(e)); }
    finally { setBusy(false); }
  };
  const saveMeta = async (m: M) => {
    const e = edits[m.id] ?? { alt_text: m.alt_text, credit: m.credit ?? '' };
    setBanner('');
    try {
      await request(`/media/${m.id}`, { method: 'PATCH', body: { alt_text: e.alt_text, credit: e.credit, is_public: m.is_public } });
      show('सहेजा गया'); list.reload();
    } catch (err) { setBanner(errorText(err)); }
  };

  return (
    <>
      <PageTitle>चित्र</PageTitle>
      {toast}
      <div className="toolbar">
        <div className="field inline grow">
          <label htmlFor="file">चित्र चुनें (JPEG, PNG या WebP, अधिकतम 5 MB)</label>
          <input id="file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
        </div>
      </div>
      {banner && <p className="banner" role="alert">{banner}</p>}
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      {list.data && list.data.items.length === 0 && <p className="state">अभी कोई चित्र नहीं है।</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="media-list">
          {list.data.items.map((m) => {
            const e = edits[m.id] ?? { alt_text: m.alt_text, credit: m.credit ?? '' };
            return (
              <li key={m.id} className="media-item">
                <Image src={m.url} alt={m.alt_text || 'वैकल्पिक पाठ अभी नहीं भरा गया'} width={m.width} height={m.height} unoptimized />
                <div>
                  <Field id={`alt-${m.id}`} label="वैकल्पिक पाठ" error={m.alt_text ? undefined : 'सार्वजनिक उपयोग से पहले आवश्यक'}>
                    <input id={`alt-${m.id}`} value={e.alt_text} onChange={(ev) => setEdits({ ...edits, [m.id]: { ...e, alt_text: ev.target.value } })} />
                  </Field>
                  <Field id={`credit-${m.id}`} label="श्रेय">
                    <input id={`credit-${m.id}`} value={e.credit} onChange={(ev) => setEdits({ ...edits, [m.id]: { ...e, credit: ev.target.value } })} />
                  </Field>
                  <p className="sub">{m.width}×{m.height} · {Math.round(m.bytes / 1024)} KB</p>
                  <div className="actions">
                    <button type="button" className="btn" onClick={() => void saveMeta(m)}>सहेजें</button>
                    {can.admin(user.role) && (
                      <button
                        type="button" className="btn btn-danger"
                        onClick={async () => {
                          if (!ask('यह चित्र हटाएँ? यह वापस नहीं होगा।')) return;
                          try { await request(`/media/${m.id}`, { method: 'DELETE' }); show('हटाया गया'); list.reload(); }
                          catch (err) { setBanner(errorText(err)); }
                        }}
                      >
                        हटाएँ
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
