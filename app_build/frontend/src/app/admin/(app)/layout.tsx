import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { getAdminMe } from '@/lib/admin-server';

/** Every admin page except the login passes through here: no session, no page. The API checks again on every call. */
export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const me = await getAdminMe();
  if (!me) redirect('/admin/login');
  return <AdminShell user={me.user} csrf={me.csrf_token}>{children}</AdminShell>;
}
