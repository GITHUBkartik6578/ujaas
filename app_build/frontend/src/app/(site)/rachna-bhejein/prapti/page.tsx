'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Receipt: shown only right after a successful send. The reference lives in this tab's session storage, not in the
 * address, so it never reaches a log or a shared link. Opening this page any other way goes back to the form.
 */
export default function ReceiptPage() {
  const router = useRouter();
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    let value: string | null = null;
    try { value = sessionStorage.getItem('ujaas.submission.ref'); } catch { /* treated as no receipt */ }
    if (!value) { router.replace('/rachna-bhejein'); return; }
    // The receipt lives in this tab's session storage, which only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRef(value);
  }, [router]);

  if (!ref) return <div className="frame page"><p aria-busy="true">लोड हो रहा है…</p></div>;
  return (
    <div className="frame page">
      <meta name="robots" content="noindex, nofollow" />
      <h1>आपकी रचना प्राप्त हुई</h1>
      <p className="lead-text">धन्यवाद। आपका संदर्भ क्रमांक:</p>
      <p className="reference" aria-label="संदर्भ क्रमांक"><strong>{ref}</strong></p>
      <p>इसे सुरक्षित रखें। संपादकीय समीक्षा के बाद ही कोई रचना प्रकाशित होती है, और प्रकाशन की कोई गारंटी नहीं है।</p>
      <p><Link href="/sahitya">साहित्य पढ़ें</Link></p>
    </div>
  );
}
