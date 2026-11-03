import 'server-only';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface AdminMe {
  user: { id: string; email: string; display_name: string; role: 'site_admin' | 'editor_in_chief' | 'editor' | 'content_manager' };
  csrf_token: string;
}

/** Asks the API who the visitor is, forwarding their session cookie. Null when not signed in. */
export async function getAdminMe(): Promise<AdminMe | null> {
  const h = await headers();
  const cookie = h.get('cookie');
  if (!cookie) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/auth/me`, {
      cache: 'no-store',
      headers: { cookie, ...(h.get('x-forwarded-for') ? { 'x-forwarded-for': h.get('x-forwarded-for')! } : {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminMe;
  } catch {
    return null;
  }
}
