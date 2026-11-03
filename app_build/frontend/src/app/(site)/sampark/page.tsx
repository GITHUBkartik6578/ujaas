import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { Breadcrumbs } from '@/components/parts';
import { apiOrNull } from '@/lib/api';
import { absUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'संपर्क',
  description: 'उजास के संपादकों को संदेश भेजें।',
  alternates: { canonical: absUrl('/sampark') },
};

const LABELS: Array<[string, string]> = [
  ['contact_email', 'ईमेल'], ['contact_phone', 'फ़ोन'], ['contact_address', 'पता'], ['contact_hours', 'कार्य समय'],
];

/** Contact details appear only when the owner has entered them in the settings; nothing is ever filled in for them. */
export default async function ContactPage() {
  const settings = (await apiOrNull<Record<string, string>>('/settings/public').catch(() => null)) ?? {};
  const shown = LABELS.filter(([k]) => settings[k]);
  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'संपर्क' }]} />
      <h1>संपर्क</h1>
      <p className="lead-text">सुझाव, प्रश्न या सहयोग के लिए संदेश भेजें।</p>
      <div className="contact-grid">
        <ContactForm />
        {shown.length > 0 && (
          <dl className="facts contact-details" aria-label="संपर्क विवरण">
            {shown.map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>{settings[k]}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
