import type { Metadata } from 'next';
import { COPYRIGHT } from '@/content/pages';
import { absUrl } from '@/lib/site';
import { getSubmissionConfig } from '@/lib/submission';
import { PolicyPage } from '@/components/page/PolicyPage';

export const metadata: Metadata = {
  title: 'कॉपीराइट और रचना नीति',
  description: 'रचना भेजने से पहले जानिए — आपकी रचना का अधिकार किसके पास रहता है, उजास उसे कैसे प्रकाशित करता है और मौलिकता क्यों सबसे ज़रूरी है।',
  alternates: { canonical: absUrl('/niti/copyright-aur-rachna-niti') },
};

export default async function CopyrightPage() {
  const { open } = await getSubmissionConfig();
  return (
    <PolicyPage
      policy="copyright" prefix="cp" noun="नीति" readTime="लगभग ८ मिनट" submitOpen={open}
      eyebrow="आपकी रचना, आपका अधिकार"
      lead="रचना भेजने से पहले जानिए — आपकी रचना का अधिकार किसके पास रहता है, उजास उसे कैसे प्रकाशित करता है और मौलिकता क्यों सबसे ज़रूरी है।"
      sections={COPYRIGHT.sections} checks={COPYRIGHT.checks}
    />
  );
}
