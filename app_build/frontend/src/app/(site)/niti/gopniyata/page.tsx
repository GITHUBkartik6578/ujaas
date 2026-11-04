import type { Metadata } from 'next';
import { PRIVACY } from '@/content/pages';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { PolicyPage } from '@/components/page/PolicyPage';

export const metadata: Metadata = {
  title: 'गोपनीयता नीति',
  description: 'उजास पर आप जो भी जानकारी साझा करते हैं — रचना, परिचय या संदेश — उसे हम पूरे सम्मान और सावधानी से सुरक्षित रखते हैं।',
  alternates: { canonical: absUrl('/niti/gopniyata') },
};

export default async function PrivacyPage() {
  const { open } = await getSubmissionConfig();
  return (
    <PolicyPage
      policy="privacy" prefix="pv" noun="नीति" readTime="लगभग ६ मिनट" submitOpen={open}
      eyebrow="आपकी जानकारी, हमारी ज़िम्मेदारी"
      lead="उजास पर आप जो भी जानकारी साझा करते हैं — रचना, परिचय या संदेश — उसे हम पूरे सम्मान और सावधानी से सुरक्षित रखते हैं।"
      sections={PRIVACY.sections}
    />
  );
}
