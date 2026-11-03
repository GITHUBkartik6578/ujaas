'use client';

import Link from 'next/link';
import { STATUS_LABEL, LoadState, PageTitle, formatDateTime, useLoad } from '@/components/admin/ui';
import { can, useAdmin } from '@/components/admin/session';

interface Dash {
  counts: Record<string, number>;
  scheduled_upcoming: Array<{ id: string; title: string; scheduled_at: string | null }>;
  scheduler_alerts: Array<{ id: string; title: string; schedule_error: string | null }>;
  submissions_pending: number;
  recent: Array<{ at: string; action: string; entity: string; actor: string }>;
}
interface Ops { db: string; scheduler: { started: boolean; last_run_at: string | null; last_error: string | null } }

const ORDER = ['draft', 'in_review', 'approved', 'scheduled', 'published', 'unpublished', 'archived'];

export default function DashboardPage() {
  const { request, user } = useAdmin();
  const dash = useLoad(() => request<Dash>('/dashboard'), []);
  const ops = useLoad(() => (can.admin(user.role) ? request<Ops>('/ops/health') : Promise.resolve(null)), []);
  const d = dash.data;
  return (
    <>
      <PageTitle action={<Link className="btn btn-primary" href="/admin/content/new">नई रचना</Link>}>डैशबोर्ड</PageTitle>
      <LoadState error={dash.error} loading={dash.loading} retry={dash.reload} />
      {d && (
        <>
          {d.scheduler_alerts.length > 0 && (
            <section className="alert-strip" role="alert" aria-labelledby="alerts-h">
              <h2 id="alerts-h">निर्धारित प्रकाशन विफल रहे</h2>
              <ul>
                {d.scheduler_alerts.map((a) => (
                  <li key={a.id}><Link href={`/admin/content/${a.id}`}>{a.title}</Link>: {a.schedule_error}</li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="counts-h">
            <h2 id="counts-h">रचनाएँ स्थिति के अनुसार</h2>
            <dl className="counts">
              {ORDER.map((s) => (
                <div key={s}>
                  <dt>{STATUS_LABEL[s]}</dt>
                  <dd>{d.counts[s] ?? 0}</dd>
                </div>
              ))}
              <div>
                <dt>समीक्षा की प्रतीक्षा में प्रविष्टियाँ</dt>
                <dd>{can.editorUp(user.role) ? <Link href="/admin/submissions?status=pending_review">{d.submissions_pending}</Link> : d.submissions_pending}</dd>
              </div>
            </dl>
          </section>
          <div className="two-col">
            <section aria-labelledby="up-h">
              <h2 id="up-h">आगामी निर्धारित प्रकाशन</h2>
              {d.scheduled_upcoming.length === 0 ? (
                <p className="muted">कोई रचना निर्धारित नहीं है।</p>
              ) : (
                <table className="table">
                  <thead><tr><th>रचना</th><th className="num">समय</th></tr></thead>
                  <tbody>
                    {d.scheduled_upcoming.map((s) => (
                      <tr key={s.id}>
                        <td><Link href={`/admin/content/${s.id}`}>{s.title}</Link></td>
                        <td className="num">{formatDateTime(s.scheduled_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section aria-labelledby="recent-h">
              <h2 id="recent-h">हाल की गतिविधि</h2>
              {d.recent.length === 0 ? (
                <p className="muted">अभी कोई गतिविधि नहीं।</p>
              ) : (
                <table className="table">
                  <thead><tr><th>कार्य</th><th className="num">समय</th></tr></thead>
                  <tbody>
                    {d.recent.map((r, i) => (
                      <tr key={i}>
                        <td><code>{r.action}</code></td>
                        <td className="num">{formatDateTime(r.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
      {ops.data && (
        <section aria-labelledby="ops-h">
          <h2 id="ops-h">सेवा की स्थिति</h2>
          <p>
            डेटाबेस: {ops.data.db === 'up' ? 'चालू' : 'बंद'} · प्रकाशन शेड्यूलर: {ops.data.scheduler.started ? 'चालू' : 'बंद'}
            {ops.data.scheduler.last_run_at && <> · अंतिम चक्र {formatDateTime(ops.data.scheduler.last_run_at)}</>}
            {ops.data.scheduler.last_error && <> · त्रुटि: {ops.data.scheduler.last_error}</>}
          </p>
        </section>
      )}
    </>
  );
}
