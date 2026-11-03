import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, EmptyState } from '@/components/parts';
import { SubmissionForm } from '@/components/SubmissionForm';
import { getSubmissionConfig } from '@/lib/submission';
import { absUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'अपनी रचना भेजें',
  description: 'अपनी मौलिक रचना उजास को भेजें। हर रचना संपादकीय समीक्षा के बाद ही प्रकाशित होती है।',
  alternates: { canonical: absUrl('/rachna-bhejein') },
};

export default async function SubmitPage() {
  const config = await getSubmissionConfig();
  return (
    <div className="frame page">
      <Breadcrumbs items={[{ label: 'मुख्य पृष्ठ', href: '/' }, { label: 'अपनी रचना भेजें' }]} />
      <h1>अपनी रचना भेजें</h1>
      {config.open && config.version && config.consents && config.body_max ? (
        <>
          <p className="lead-text">रचनाकार खाता नहीं चाहिए। भेजने के बाद आपको एक संदर्भ क्रमांक मिलेगा, और हर रचना की संपादकीय समीक्षा होगी।</p>
          <SubmissionForm config={{ version: config.version, consents: config.consents, body_max: config.body_max }} />
        </>
      ) : (
        <EmptyState title="रचनाएँ अभी स्वीकार नहीं की जा रहीं">
          <p>यह सुविधा जल्द शुरू होगी। तब तक आप <Link href="/sahitya">साहित्य</Link> पढ़ सकते हैं या <Link href="/sampark">संपर्क</Link> कर सकते हैं।</p>
        </EmptyState>
      )}
    </div>
  );
}
