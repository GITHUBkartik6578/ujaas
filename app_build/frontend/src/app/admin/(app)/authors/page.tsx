'use client';

import { useState } from 'react';
import { Field, LoadState, PageTitle, errorText, fieldErrors, useLoad, useToast } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

interface Author {
  id: string; name: string; slug: string; bio: string | null; is_public: boolean; archived: boolean;
  birth_year: number | null; birthplace: string | null; private_contact: string | null; photo_media_id: string | null;
}
interface MediaOpt { id: string; alt_text: string; width: number; height: number }

const BLANK = { name: '', slug: '', bio: '', is_public: false, archived: false, birth_year: '', birthplace: '', private_contact: '', photo_media_id: '' };

export default function AuthorsPage() {
  const { request } = useAdmin();
  const list = useLoad(() => request<{ items: Author[] }>('/authors?page_size=100'), []);
  const media = useLoad(() => request<{ items: MediaOpt[] }>('/media?page_size=100'), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const { toast, show } = useToast();

  const edit = (a: Author | null) => {
    setEditing(a?.id ?? 'new');
    setErrors({}); setBanner('');
    setF(a ? { name: a.name, slug: a.slug, bio: a.bio ?? '', is_public: a.is_public, archived: a.archived, birth_year: a.birth_year?.toString() ?? '', birthplace: a.birthplace ?? '', private_contact: a.private_contact ?? '', photo_media_id: a.photo_media_id ?? '' } : BLANK);
  };

  const save = async () => {
    setErrors({}); setBanner('');
    const body: Record<string, unknown> = {
      name: f.name, bio: f.bio || null, is_public: f.is_public, birth_year: f.birth_year ? Number(f.birth_year) : null,
      birthplace: f.birthplace || null, private_contact: f.private_contact || null, photo_media_id: f.photo_media_id || null,
    };
    if (f.slug) body.slug = f.slug;
    if (editing !== 'new') body.archived = f.archived;
    try {
      await request(editing === 'new' ? '/authors' : `/authors/${editing}`, { method: editing === 'new' ? 'POST' : 'PATCH', body });
      show('सहेजा गया'); setEditing(null); list.reload();
    } catch (e) { setErrors(fieldErrors(e)); setBanner(errorText(e)); }
  };

  return (
    <>
      <PageTitle action={<button type="button" className="btn btn-primary" onClick={() => edit(null)}>नया रचनाकार</button>}>रचनाकार</PageTitle>
      {toast}
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      <div className="split">
        <div>
          {list.data && list.data.items.length === 0 && <p className="state">अभी कोई रचनाकार नहीं है।</p>}
          {list.data && list.data.items.length > 0 && (
            <table className="table">
              <thead><tr><th>नाम</th><th>सार्वजनिक प्रोफ़ाइल</th><th>पता</th></tr></thead>
              <tbody>
                {list.data.items.map((a) => (
                  <tr key={a.id}>
                    <td><button type="button" className="linklike" onClick={() => edit(a)}>{a.name}</button>{a.archived && <span className="sub"> संग्रहित</span>}</td>
                    <td>{a.is_public ? 'हाँ' : 'नहीं'}</td>
                    <td><code>{a.slug}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {editing && (
          <form className="panel" onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="रचनाकार का विवरण">
            <h2>{editing === 'new' ? 'नया रचनाकार' : 'रचनाकार संपादित करें'}</h2>
            {banner && <p className="banner" role="alert">{banner}</p>}
            <Field id="a-name" label="नाम" error={errors.name}><input id="a-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field id="a-slug" label="पता (वैकल्पिक)" error={errors.slug}><input id="a-slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field>
            <Field id="a-bio" label="परिचय"><textarea id="a-bio" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
            <div className="row">
              <Field id="a-year" label="जन्म वर्ष"><input id="a-year" type="number" min={1000} max={2100} value={f.birth_year} onChange={(e) => setF({ ...f, birth_year: e.target.value })} /></Field>
              <Field id="a-place" label="जन्म स्थान"><input id="a-place" value={f.birthplace} onChange={(e) => setF({ ...f, birthplace: e.target.value })} /></Field>
            </div>
            <Field id="a-photo" label="चित्र" error={errors.photo_media_id} hint="सार्वजनिक प्रोफ़ाइल में चित्र के लिए वैकल्पिक पाठ और अनुमति आवश्यक है।">
              <select id="a-photo" value={f.photo_media_id} onChange={(e) => setF({ ...f, photo_media_id: e.target.value })}>
                <option value="">कोई नहीं</option>
                {media.data?.items.map((m) => <option key={m.id} value={m.id}>{m.alt_text || 'वैकल्पिक पाठ नहीं'} ({m.width}×{m.height})</option>)}
              </select>
            </Field>
            <Field id="a-contact" label="निजी संपर्क (सार्वजनिक नहीं दिखता)"><input id="a-contact" value={f.private_contact} onChange={(e) => setF({ ...f, private_contact: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={f.is_public} onChange={(e) => setF({ ...f, is_public: e.target.checked })} /> लेखक की सहमति है: सार्वजनिक प्रोफ़ाइल दिखाएँ</label>
            {editing !== 'new' && <label className="check"><input type="checkbox" checked={f.archived} onChange={(e) => setF({ ...f, archived: e.target.checked })} /> संग्रहित करें (प्रोफ़ाइल हट जाएगी)</label>}
            <div className="actions">
              <button className="btn btn-primary" type="submit">सहेजें</button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>रद्द करें</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
