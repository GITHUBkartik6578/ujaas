import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiOrNull, type Full } from '@/lib/api';
import { ReadingView } from '@/components/ReadingView';

// A signed, time-limited preview of an unpublished item. Never indexed, never cached.
export const metadata: Metadata = { title: 'पूर्वावलोकन', robots: { index: false, follow: false } };

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await apiOrNull<Full>(`/preview/${encodeURIComponent(token)}`);
  if (!c) notFound();
  return <ReadingView c={c} preview />;
}
