'use client';

import { useState } from 'react';
import { Field, LoadState, PageTitle, ask, errorText, fieldErrors, useLoad, useToast } from '@/components/admin/ui';
import { AdminApiError, can, useAdmin } from '@/components/admin/session';

interface Author {
  id: string; name: string; slug: string; bio: string | null; is_public: boolean; archived: boolean;
  birth_year: number | null; birthplace: string | null; private_contact: string | null; photo_media_id: string | null;
}
interface MediaOpt { id: string; alt_text: string; width: number; height: number }

const BLANK = { name: '', slug: '', bio: '', is_public: false, archived: false, birth_year: '', birthplace: '', private_contact: '', photo_media_id: '' };

export default function AuthorsPage() {
  const { request, user } = useAdmin();
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
      show('Saved'); setEditing(null); list.reload();
    } catch (e) { setErrors(fieldErrors(e)); setBanner(errorText(e)); }
  };

  /** Permanent delete. An author with works asks a second question: delete the works too? */
  const remove = async () => {
    if (editing === null || editing === 'new') return;
    if (!ask(`Delete "${f.name}" permanently? This cannot be undone.`)) return;
    setBanner('');
    try {
      await request(`/authors/${editing}`, { method: 'DELETE' });
    } catch (e) {
      if (!(e instanceof AdminApiError && e.fields.some((x) => x.code === 'has_works'))) { setBanner(errorText(e)); return; }
      const msg = e.fields.find((x) => x.code === 'has_works')?.message_hi ?? '';
      if (!ask(`This author still has works (${msg}). Delete the author AND the works credited only to this author? Works shared with other authors are kept and only lose this credit. This cannot be undone.`)) return;
      try { await request(`/authors/${editing}?with_works=1`, { method: 'DELETE' }); } catch (e2) { setBanner(errorText(e2)); return; }
    }
    show('Deleted'); setEditing(null); list.reload();
  };

  return (
    <>
      <PageTitle action={<button type="button" className="btn btn-primary" onClick={() => edit(null)}>New author</button>}>Authors</PageTitle>
      {toast}
      <LoadState error={list.error} loading={list.loading} retry={list.reload} />
      <div className="split">
        <div>
          {list.data && list.data.items.length === 0 && <p className="state">No authors yet.</p>}
          {list.data && list.data.items.length > 0 && (
            <table className="table">
              <thead><tr><th>Name</th><th>Public profile</th><th>Slug</th></tr></thead>
              <tbody>
                {list.data.items.map((a) => (
                  <tr key={a.id}>
                    <td><button type="button" className="linklike" onClick={() => edit(a)}>{a.name}</button>{a.archived && <span className="sub"> archived</span>}</td>
                    <td>{a.is_public ? 'Yes' : 'No'}</td>
                    <td><code>{a.slug}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {editing && (
          <form className="panel" onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Author details">
            <h2>{editing === 'new' ? 'New author' : 'Edit author'}</h2>
            {banner && <p className="banner" role="alert">{banner}</p>}
            <Field id="a-name" label="Name" error={errors.name}><input id="a-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field id="a-slug" label="Slug (optional)" error={errors.slug}><input id="a-slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></Field>
            <Field id="a-bio" label="Bio"><textarea id="a-bio" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
            <div className="row">
              <Field id="a-year" label="Birth year"><input id="a-year" type="number" min={1000} max={2100} value={f.birth_year} onChange={(e) => setF({ ...f, birth_year: e.target.value })} /></Field>
              <Field id="a-place" label="Birthplace"><input id="a-place" value={f.birthplace} onChange={(e) => setF({ ...f, birthplace: e.target.value })} /></Field>
            </div>
            <Field id="a-photo" label="Photo" error={errors.photo_media_id} hint="A photo on a public profile needs alt text and permission.">
              <select id="a-photo" value={f.photo_media_id} onChange={(e) => setF({ ...f, photo_media_id: e.target.value })}>
                <option value="">None</option>
                {media.data?.items.map((m) => <option key={m.id} value={m.id}>{m.alt_text || 'No alt text'} ({m.width}×{m.height})</option>)}
              </select>
            </Field>
            <Field id="a-contact" label="Private contact (never shown publicly)"><input id="a-contact" value={f.private_contact} onChange={(e) => setF({ ...f, private_contact: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={f.is_public} onChange={(e) => setF({ ...f, is_public: e.target.checked })} /> Author has consented: show public profile</label>
            {editing !== 'new' && <label className="check"><input type="checkbox" checked={f.archived} onChange={(e) => setF({ ...f, archived: e.target.checked })} /> Archive (the profile will be removed)</label>}
            <div className="actions">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
              {editing !== 'new' && can.admin(user.role) && <button className="btn btn-danger" type="button" onClick={() => void remove()}>Delete author</button>}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
