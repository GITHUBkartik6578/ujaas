'use client';

import { useState } from 'react';

// Error state with retry (FR-015). No error text from the server is shown to the visitor.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="ph ph-md kn-error" aria-labelledby="err-h">
      <div className="ph-inner">
        <div className="ph-copy kn-error-copy">
          <p className="ph-eyebrow">थोड़ी देर ठहरिए</p>
          <div className="ph-title"><h1 id="err-h">कुछ गड़बड़ हुई</h1></div>
          <p className="ph-lead">पृष्ठ लोड नहीं हो सका। कृपया फिर से प्रयास करें।</p>
          <div className="ph-ctas">
            <button type="button" className="cta-btn cta-primary" disabled={busy} onClick={() => { setBusy(true); reset(); setTimeout(() => setBusy(false), 1400); }}>
              <svg className={busy ? 'kn-spin' : undefined} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
              {busy ? 'फिर से लोड हो रहा है…' : 'फिर से प्रयास करें'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
