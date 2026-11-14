'use client';

import { useState } from 'react';
import { Field, LoadState, PageTitle, errorText, fieldErrors, useLoad, useToast } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

const LABELS: Array<[string, string]> = [
  ['site_description', 'Short site description'], ['contact_email', 'Contact email'], ['contact_phone', 'Contact phone'],
  ['contact_address', 'Address'], ['contact_hours', 'Office hours'], ['social_facebook', 'Facebook URL'], ['social_instagram', 'Instagram URL'],
  ['social_youtube', 'YouTube URL'], ['social_x', 'X URL'], ['social_telegram', 'Telegram URL'],
];

/** Only values that exist are shown on the public site: an empty field renders nothing (content_safety). */
export default function SettingsPage() {
  const { request } = useAdmin();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const { toast, show } = useToast();
  const data = useLoad(async () => {
    const v = await request<Record<string, string>>('/settings');
    setValues(v);
    return v;
  }, []);

  return (
    <>
      <PageTitle>Site settings</PageTitle>
      <LoadState error={data.error} loading={data.loading} retry={data.reload} />
      {data.data && (
        <form
          className="panel narrow"
          onSubmit={async (e) => {
            e.preventDefault(); setErrors({}); setBanner('');
            try { await request('/settings', { method: 'PUT', body: { values } }); show('Saved'); }
            catch (err) { setErrors(fieldErrors(err)); setBanner(errorText(err)); }
          }}
        >
          <p className="muted">Fields left empty are not shown on the site. Only enter what you have permission to publish.</p>
          {banner && <p className="banner" role="alert">{banner}</p>}
          {LABELS.map(([k, label]) => (
            <Field key={k} id={`s-${k}`} label={label} error={errors[`values.${k}`]}>
              <input id={`s-${k}`} value={values[k] ?? ''} maxLength={500} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
            </Field>
          ))}
          <div className="actions">
            <button type="submit" className="btn btn-primary">Save</button>
            {toast}
          </div>
        </form>
      )}
    </>
  );
}
