'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Receipt ticket: shown only right after a successful send. The reference lives in this tab's session storage,
 * not in the address, so it never reaches a log or a shared link. Opening the page any other way goes back to the form.
 */
export function ReceiptTicket({ mark }: { mark: React.ReactNode }) {
  const router = useRouter();
  const [ref, setRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let value: string | null = null;
    try { value = sessionStorage.getItem('ujaas.submission.ref'); } catch { /* treated as no receipt */ }
    if (!value) { router.replace('/rachna-bhejein'); return; }
    // The receipt lives in this tab's session storage, which only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRef(value);
  }, [router]);

  if (!ref) return <p className="kg-wait" aria-busy="true">लोड हो रहा है…</p>;
  return (
    <>
      <div className="kg-ticket">
        <div className="kg-main">
          <p className="pg-kick-line">प्राप्ति-पत्र</p>
          <h2 id="kg-ref-h" className="kg-h2">धन्यवाद। आपका संदर्भ क्रमांक:</h2>
          <p className="kg-ref" aria-label="संदर्भ क्रमांक"><strong>{ref}</strong></p>
          <div className="kg-copy-row">
            <button
              type="button" className="cta-btn cta-primary"
              onClick={async () => { try { await navigator.clipboard.writeText(ref); setCopied(true); } catch { /* clipboard unavailable */ } }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
              {copied ? 'कॉपी हो गया' : 'क्रमांक कॉपी करें'}
            </button>
            <span role="status" className="kg-copied">{copied ? 'क्लिपबोर्ड में' : ''}</span>
          </div>
          <p className="kg-keep">इसे सुरक्षित रखें। संपादकीय समीक्षा के बाद ही कोई रचना प्रकाशित होती है, और प्रकाशन की कोई गारंटी नहीं है।</p>
        </div>
        <div className="kg-stub">
          {mark}
          <p className="kg-stub-word">उजास</p>
          <p className="kg-stub-status">स्थिति: <strong>समीक्षा की प्रतीक्षा</strong></p>
        </div>
      </div>
      <div className="cta-row kg-actions">
        <Link className="cta-btn cta-primary" href="/sahitya">साहित्य पढ़ें</Link>
        <Link className="cta-btn cta-outline" href="/">मुख्य पृष्ठ</Link>
      </div>
    </>
  );
}
