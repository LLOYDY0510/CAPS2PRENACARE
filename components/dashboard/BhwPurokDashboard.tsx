import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

const RISK_COLORS = {
  high: 'var(--danger)',
  low: 'var(--success)',
};

export default async function BhwPurokDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, purok')
    .eq('id', user.id)
    .single();

  const purok = profile?.purok ?? 'Unknown';

  // Get pregnant mothers in this BHW's purok only
  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, full_name, purok, risk_level, age, lmp, gravida_para, date_registered, checkup_recorded'
    )
    .eq('purok', purok)
    .order('date_registered', { ascending: false });

  const total = records?.length ?? 0;
  const highRisk = records?.filter((r) => r.risk_level === 'high').length ?? 0;
  const lowRisk = records?.filter((r) => r.risk_level === 'low').length ?? 0;
  const withCheckups = records?.filter((r) => r.checkup_recorded).length ?? 0;

  // Get upcoming checkups for mothers in this purok
  const { data: upcomingCheckups } = await supabase
    .from('prenatal_schedules')
    .select(`
      id,
      visit_date,
      status,
      pregnant_mother_id,
      pregnant_mothers (
        full_name,
        risk_level
      )
    `)
    .gte('visit_date', new Date().toISOString().split('T')[0])
    .eq('status', 'scheduled')
    .order('visit_date', { ascending: true })
    .limit(5);

  // Get missed checkups for follow-up
  const { data: missedCheckups } = await supabase
    .from('prenatal_checkups')
    .select(`
      id,
      checkup_date,
      scheduled_checkup_date,
      actual_checkup_date,
      status,
      pregnant_mother_id,
      pregnant_mothers (
        full_name,
        risk_level,
        purok
      )
    `)
    .eq('status', 'missed')
    .order('checkup_date', { ascending: false })
    .limit(5);

  // Filter missed checkups to only those in this BHW's purok
  const missedCheckupsInPurok = missedCheckups?.filter(
    (checkup) => checkup.pregnant_mothers?.purok === purok
  ) ?? [];

  // Get notifications for this BHW
  const { data: notifications } = await supabase
    .from('maternal_notifications')
    .select('id, title, message, category, read_at, created_at')
    .eq('recipient_role', 'bhw_purok')
    .eq('recipient_purok', purok)
    .order('created_at', { ascending: false })
    .limit(10);

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>BHW Dashboard — Purok {purok}</h1>
        <p className="page-date">{today}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Mothers"
          value={total}
          color="var(--brand)"
          href="/dashboard/pregnant"
          footer="View all records"
        />
        <KpiCard
          label="High Risk"
          value={highRisk}
          color="var(--danger)"
          href="/dashboard/risk-list/high"
        />
        <KpiCard
          label="Low Risk"
          value={lowRisk}
          color="var(--success)"
          href="/dashboard/risk-list/low"
        />
        <KpiCard
          label="With Checkups"
          value={withCheckups}
          color="#8B5CF6"
          href="/dashboard/checkups"
          footer="Checkup records"
        />
      </div>

      {/* Alerts and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Missed Checkups Alert */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Missed Checkups</h2>
            <span className="text-sm text-muted">{missedCheckupsInPurok.length} require follow-up</span>
          </div>
          {missedCheckupsInPurok.length === 0 ? (
            <p className="text-sm text-muted-2 text-center py-4">No missed checkups</p>
          ) : (
            <div className="space-y-2">
              {missedCheckupsInPurok.map((checkup) => (
                <div
                  key={checkup.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <div>
                    <p className="font-medium text-sm">{checkup.pregnant_mothers?.full_name}</p>
                    <p className="text-xs text-muted">
                      Missed: {checkup.checkup_date || checkup.scheduled_checkup_date}
                    </p>
                  </div>
                  {checkup.pregnant_mothers?.risk_level === 'high' && (
                    <span className="badge-high text-xs">High Risk</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-brand text-white text-xs px-2 py-1 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read_at ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-100'
                  }`}
                >
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-muted mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-2 mt-2">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-2 text-center py-4">No notifications</p>
          )}
        </div>
      </div>

      {/* Upcoming Checkups */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Checkups</h2>
          <Link href="/dashboard/schedule" className="text-sm text-brand">
            View schedule →
          </Link>
        </div>
        {upcomingCheckups && upcomingCheckups.length > 0 ? (
          <div className="space-y-2">
            {upcomingCheckups.map((checkup) => (
              <div
                key={checkup.id}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
              >
                <div>
                  <p className="font-medium text-sm">{checkup.pregnant_mothers?.full_name}</p>
                  <p className="text-xs text-muted">Scheduled: {checkup.visit_date}</p>
                </div>
                {checkup.pregnant_mothers?.risk_level === 'high' && (
                  <span className="badge-high text-xs">High Risk</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-2 text-center py-4">No upcoming checkups scheduled</p>
        )}
      </div>

      {/* Recent Registrations */}
      <div className="card overflow-x-auto">
        <div className="section-header">
          <h2>Recent Registrations in Purok {purok}</h2>
          <Link href="/dashboard/pregnant" className="text-sm text-brand">
            View all →
          </Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Name</th>
              <th>Age</th>
              <th>LMP</th>
              <th>G-P</th>
              <th>Risk</th>
              <th>Date Registered</th>
            </tr>
          </thead>
          <tbody>
            {records && records.length > 0 ? (
              records.slice(0, 5).map((r) => (
                <tr key={r.id}>
                  <td>{r.serial_no ?? '—'}</td>
                  <td className="font-medium">{r.full_name ?? '—'}</td>
                  <td>{r.age ?? '—'}</td>
                  <td>{r.lmp ?? '—'}</td>
                  <td>{r.gravida_para ?? '—'}</td>
                  <td>
                    {r.risk_level === 'high' ? (
                      <span className="badge-high">High Risk</span>
                    ) : (
                      <span className="badge-low">Low Risk</span>
                    )}
                  </td>
                  <td>{r.date_registered ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-2">
                  No mothers registered in Purok {purok}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function KpiCard({
  label,
  value,
  color,
  href,
  footer = 'View details',
}: {
  label: string;
  value: number;
  color: string;
  href?: string;
  footer?: string;
}) {
  const inner = (
    <div className="stat-card h-full">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>
        {value}
      </p>
      {href && (
        <p className="stat-footer flex items-center gap-1">
          {footer} <span aria-hidden>→</span>
        </p>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  ) : (
    <>{inner}</>
  );
}
