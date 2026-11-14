'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Signs in with a generic error (the API never says whether the email exists). */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <main className="login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const res = await fetch('/api/v1/admin/auth/login', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
              body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
              router.push('/admin');
              router.refresh();
              return;
            }
            setError(res.status === 429 ? 'Too many attempts. Please try again in a little while.' : 'Incorrect email or password.');
          } catch {
            setError('Could not reach the server. Please try again.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="brand-line"><span className="brand-name">Ujaas</span> <span className="brand-scope">Admin</span></p>
        <h1>Log in</h1>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>Log in</button>
      </form>
    </main>
  );
}
