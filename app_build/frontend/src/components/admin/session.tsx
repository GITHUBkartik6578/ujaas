'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type Role = 'site_admin' | 'editor_in_chief' | 'editor' | 'content_manager';
export interface AdminUser { id: string; email: string; display_name: string; role: Role }

export interface FieldError { field: string; code: string; message_hi?: string }
export class AdminApiError extends Error {
  constructor(public status: number, public code: string, public fields: FieldError[], public messageHi?: string) {
    super(`${status} ${code}`);
  }
}

interface RequestInitLite { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; ifMatch?: number; formData?: FormData }

interface Session {
  user: AdminUser;
  request: <T>(path: string, init?: RequestInitLite) => Promise<T>;
  dirty: boolean;
  setDirty: (v: boolean) => void;
}

const Ctx = createContext<Session | null>(null);
export const useAdmin = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useAdmin outside AdminShell');
  return s;
};

const isEditorUp = (r: Role) => r !== 'content_manager';
const isChiefUp = (r: Role) => r === 'site_admin' || r === 'editor_in_chief';
export const can = { editorUp: isEditorUp, chiefUp: isChiefUp, admin: (r: Role) => r === 'site_admin' };

/**
 * Holds the signed-in admin and the CSRF token, and makes every admin call. When the session has expired
 * (401), a small dialog asks for the password again in place and the call is retried, so nothing typed is lost.
 */
export function AdminSessionProvider({ user, csrf: initialCsrf, children }: { user: AdminUser; csrf: string; children: React.ReactNode }) {
  const csrf = useRef(initialCsrf);
  const [dirty, setDirty] = useState(false);
  const [relogin, setRelogin] = useState<null | { resolve: () => void; reject: () => void }>(null);
  const pending = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const askRelogin = useCallback(() => {
    // Several calls can fail at once; they share one dialog.
    pending.current ??= new Promise<void>((resolve, reject) => setRelogin({ resolve, reject })).finally(() => { pending.current = null; });
    return pending.current;
  }, []);

  const raw = useCallback(async (path: string, init: RequestInitLite) => {
    const headers: Record<string, string> = { 'X-CSRF-Token': csrf.current };
    let body: BodyInit | undefined;
    if (init.formData) body = init.formData;
    else if (init.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.body); }
    if (init.ifMatch !== undefined) headers['If-Match'] = String(init.ifMatch);
    return fetch(`/api/v1/admin${path}`, { method: init.method ?? 'GET', headers, body, credentials: 'same-origin' });
  }, []);

  const request = useCallback(async <T,>(path: string, init: RequestInitLite = {}): Promise<T> => {
    let res = await raw(path, init);
    if (res.status === 401) {
      await askRelogin();
      res = await raw(path, init);
    }
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = (data as { error?: { code?: string; fields?: FieldError[]; message_hi?: string } }).error ?? {};
      throw new AdminApiError(res.status, e.code ?? 'error', e.fields ?? [], e.message_hi);
    }
    return data as T;
  }, [raw, askRelogin]);

  return (
    <Ctx.Provider value={{ user, request, dirty, setDirty }}>
      {children}
      {relogin && (
        <ReloginDialog
          email={user.email}
          onDone={(token) => { csrf.current = token; relogin.resolve(); setRelogin(null); }}
        />
      )}
    </Ctx.Provider>
  );
}

function ReloginDialog({ email, onDone }: { email: string; onDone: (csrf: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="relogin-h"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const res = await fetch('/api/v1/admin/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
            body: JSON.stringify({ email, password }),
          });
          setBusy(false);
          if (!res.ok) { setError(res.status === 429 ? 'बहुत अधिक प्रयास, कुछ देर बाद फिर कोशिश करें।' : 'पासवर्ड सही नहीं है।'); return; }
          onDone(((await res.json()) as { csrf_token: string }).csrf_token);
        }}
      >
        <h2 id="relogin-h">सत्र समाप्त हो गया</h2>
        <p>आपका काम सुरक्षित है। जारी रखने के लिए {email} का पासवर्ड फिर से दर्ज करें।</p>
        <label htmlFor="relogin-pw">पासवर्ड</label>
        <input id="relogin-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>लॉग इन करें</button>
      </form>
    </div>
  );
}
