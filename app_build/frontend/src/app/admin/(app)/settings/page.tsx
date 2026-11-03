'use client';

import { useState } from 'react';
import { Field, LoadState, PageTitle, errorText, fieldErrors, useLoad, useToast } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/session';

const LABELS: Array<[string, string]> = [
  ['site_description', 'साइट का संक्षिप्त विवरण'], ['contact_email', 'संपर्क ईमेल'], ['contact_phone', 'संपर्क फ़ोन'],
  ['contact_address', 'पता'], ['contact_hours', 'कार्य समय'], ['social_facebook', 'फ़ेसबुक पता'], ['social_instagram', 'इंस्टाग्राम पता'],
  ['social_youtube', 'यूट्यूब पता'], ['social_x', 'X पता'], ['social_telegram', 'टेलीग्राम पता'],
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
      <PageTitle>साइट सेटिंग्स</PageTitle>
      <LoadState error={data.error} loading={data.loading} retry={data.reload} />
      {data.data && (
        <form
          className="panel narrow"
          onSubmit={async (e) => {
            e.preventDefault(); setErrors({}); setBanner('');
            try { await request('/settings', { method: 'PUT', body: { values } }); show('सहेजा गया'); }
            catch (err) { setErrors(fieldErrors(err)); setBanner(errorText(err)); }
          }}
        >
          <p className="muted">खाली छोड़ी गई जानकारी साइट पर दिखाई नहीं देती। यहाँ वही लिखें जो प्रकाशित करने की अनुमति है।</p>
          {banner && <p className="banner" role="alert">{banner}</p>}
          {LABELS.map(([k, label]) => (
            <Field key={k} id={`s-${k}`} label={label} error={errors[`values.${k}`]}>
              <input id={`s-${k}`} value={values[k] ?? ''} maxLength={500} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
            </Field>
          ))}
          <div className="actions">
            <button type="submit" className="btn btn-primary">सहेजें</button>
            {toast}
          </div>
        </form>
      )}
    </>
  );
}
