import type { Metadata } from 'next';
import { TERMS } from '@/content/pages';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { PolicyPage } from '@/components/page/PolicyPage';

export const metadata: Metadata = {
  title: 'उपयोग की शर्तें',
  description: 'उजास का उपयोग करने से पहले कृपया ये शर्तें ध्यान से पढ़ें — ये पाठकों, रचनाकारों और पत्रिका, तीनों के हितों की रक्षा करती हैं।',
  alternates: { canonical: absUrl('/niti/upyog-ki-sharten') },
};

export default async function TermsPage() {
  const { open } = await getSubmissionConfig();
  return (
    <PolicyPage
      policy="terms" prefix="tm" noun="शर्तें" readTime="लगभग ७ मिनट" submitOpen={open}
      eyebrow="साफ़ नियम, सुंदर संवाद"
      lead="उजास का उपयोग करने से पहले कृपया ये शर्तें ध्यान से पढ़ें — ये पाठकों, रचनाकारों और पत्रिका, तीनों के हितों की रक्षा करती हैं।"
      sections={TERMS.sections}
    />
  );
}
