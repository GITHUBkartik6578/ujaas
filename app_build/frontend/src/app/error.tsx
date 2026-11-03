'use client';

// Error state with retry (FR-015). No error text from the server is shown to the visitor.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="frame page">
      <h1>कुछ गड़बड़ हुई</h1>
      <p>पृष्ठ लोड नहीं हो सका। कृपया फिर से प्रयास करें।</p>
      <p>
        <button className="button" type="button" onClick={() => reset()}>फिर से प्रयास करें</button>
      </p>
    </div>
  );
}
