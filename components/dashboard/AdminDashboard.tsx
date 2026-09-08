import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

/* ─── Muted, clinical chart palette ─── */
const ZONE_COLORS: Record<string, string> = {
  '1': '#4A90D9',
  '2': '#2A7A74',
  '3': '#7B68EE',
  '4': '#E67E22',
  '5': '#C0392B',
  '6': '#8E44AD',
  '7': '#16A085',
  '8': '#D35400',
};
const UNASSIGNED_COLOR = '#CBD5E1';

const AGE_GROUP_COLORS: Record<string, string> = {
  '10-14': '#E67E22',
  '15-19': '#2A7A74',
  '20-49': '#4A90D9',
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, full_name, purok, risk_level, age, lmp, gravida_para, date_registered'
    )
    .order('date_registered', { ascending: false });

  const total      = records?.length ?? 0;
  const highRisk   = records?.filter((r) => r.risk_level === 'high').length ?? 0;
  const lowRisk    = records?.filter((r) => r.risk_level === 'low').length ?? 0;

  const byPurok: Record<string, number> = {};
  records?.forEach((r) => {
    const p = r.purok || 'Unassigned';
    byPurok[p] = (byPurok[p] || 0) + 1;
  });
  const purokEntries  = Object.entries(byPurok).sort((a, b) => a[0].localeCompare(b[0]));
  const maxPurokCount = Math.max(1, ...Object.values(byPurok));

  const AGE_GROUPS = ['10-14', '15-19', '20-49'] as const;
  const byAgeGroup: Record<string, number> = { '10-14': 0, '15-19': 0, '20-49': 0 };
  records?.forEach((r) => {
    const age = r.age;
    if (age == null) return;
    if (age >= 10 && age <= 14) byAgeGroup['10-14']++;
    else if (age >= 15 && age <= 19) byAgeGroup['15-19']++;
    else if (age >= 20 && age <= 49) byAgeGroup['20-49']++;
  });
  const maxAgeCount = Math.max(1, ...Object.values(byAgeGroup));

  const recentRecords = (records ?? []).slice(0, 5);

  const { data: profiles } = await supabase.from('profiles').select('role');
  const byRole: Record<string, number> = {};
  profiles?.forEach((p) => {
    const r = p.role || 'pending';
    byRole[r] = (byRole[r] || 0) + 1;
  });

  const totalStaff =
    (byRole['bhw_head'] ?? 0) +
    (byRole['bhw_purok'] ?? 0) +
    (byRole['nurse'] ?? 0) +
    (byRole['admin'] ?? 0);

  const highPct = total > 0 ? Math.round((highRisk / total) * 100) : 0;
  const lowPct  = total > 0 ? 100 - highPct : 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const roleLabels: Record<string, string> = {
    bhw_head: 'BHW Head',
    bhw_purok: 'BHW (Purok)',
    nurse: 'Nurse',
    admin: 'Admin',
    pregnant_mother: 'Pregnant Mother',
    pending: 'Pending',
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p className="page-date">{today}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Registered" value={total}      color="var(--brand)"   href="/dashboard/pregnant"      footer="View all records" />
        <KpiCard label="High Risk"        value={highRisk}   color="var(--danger)"  href="/dashboard/risk-list/high" />
        <KpiCard label="Low Risk"         value={lowRisk}    color="var(--success)" href="/dashboard/risk-list/low"  />
        <KpiCard label="Staff Accounts"   value={totalStaff} color="#B45309"        href="/dashboard/users"          />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Bar chart — records per zone */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2>Records per Zone</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{total} total</span>
          </div>
          {purokEntries.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex items-end gap-3" style={{ height: '160px' }}>
              {purokEntries.map(([purok, count]) => {
                const barH = Math.max(8, (count / maxPurokCount) * 130);
                return (
                  <div key={purok} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink-secondary)', fontWeight: 500 }}>{count}</span>
                    <div
                      className="w-full max-w-[36px] rounded-sm"
                      style={{ height: `${barH}px`, background: ZONE_COLORS[purok] ?? UNASSIGNED_COLOR, opacity: 0.85 }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>P{purok}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Donut — risk distribution */}
        <div className="card p-5 flex flex-col">
          <h2 className="mb-5">Risk Distribution</h2>
          {total === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border)" strokeWidth="13"/>
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke="var(--success)" strokeWidth="13"
                  strokeDasharray={`${(lowPct / 100) * 238.8} 238.8`}
                  strokeLinecap={lowPct === 100 ? 'butt' : 'round'}
                />
                {highPct > 0 && (
                  <circle
                    cx="50" cy="50" r="38" fill="none"
                    stroke="var(--danger)" strokeWidth="13"
                    strokeDasharray={`${(highPct / 100) * 238.8} 238.8`}
                    strokeDashoffset={`${-(lowPct / 100) * 238.8}`}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="flex gap-5 mt-4" style={{ fontSize: '0.75rem' }}>
                <Legend color="var(--success)" label={`Low — ${lowPct}%`}  />
                <Legend color="var(--danger)"  label={`High — ${highPct}%`} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Age group chart */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <h2>Registered by Age Group</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{total} total</span>
        </div>
        {total === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex items-end gap-10 justify-center" style={{ height: '160px' }}>
            {AGE_GROUPS.map((group) => {
              const count = byAgeGroup[group];
              const barH  = Math.max(8, (count / maxAgeCount) * 130);
              return (
                <div key={group} className="flex flex-col items-center justify-end h-full gap-1.5" style={{ width: '72px' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--ink-secondary)' }}>{count}</span>
                  <div
                    className="w-12 rounded-sm"
                    style={{ height: `${barH}px`, background: AGE_GROUP_COLORS[group], opacity: 0.85 }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>{group} yrs</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent records table */}
      <div className="card overflow-x-auto mb-4">
        <div className="section-header">
          <h2>Recent Registrations</h2>
          <Link href="/dashboard/pregnant" style={{ fontSize: '0.75rem', color: 'var(--brand)' }}>
            View all →
          </Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Name</th>
              <th>Zone</th>
              <th>Age</th>
              <th>LMP</th>
              <th>G-P</th>
              <th>Risk</th>
              <th>Date Registered</th>
            </tr>
          </thead>
          <tbody>
            {recentRecords.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
                  No records yet.
                </td>
              </tr>
            )}
            {recentRecords.map((r) => (
              <tr key={r.id}>
                <td>{r.serial_no ?? '—'}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{r.full_name ?? '—'}</td>
                <td>{r.purok ?? '—'}</td>
                <td>{r.age ?? '—'}</td>
                <td>{r.lmp ?? '—'}</td>
                <td>{r.gravida_para ?? '—'}</td>
                <td>
                  {r.risk_level === 'high'
                    ? <span className="badge-high">High Risk</span>
                    : <span className="badge-low">Low Risk</span>
                  }
                </td>
                <td>{r.date_registered ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Staff by role */}
      <div className="card p-5">
        <h2 className="mb-4">Staff by Role</h2>
        {Object.keys(byRole).length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-2)' }}>No accounts yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(byRole)
              .filter(([r]) => r !== 'pregnant_mother')
              .sort((a, b) => b[1] - a[1])
              .map(([r, count]) => (
                <div
                  key={r}
                  className="flex items-center justify-between rounded px-3 py-2.5"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
                >
                  <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    {roleLabels[r] ?? r}
                  </span>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink)' }}>
                    {count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function KpiCard({
  label, value, color, href, footer = 'View details',
}: {
  label: string; value: number; color: string; href?: string; footer?: string;
}) {
  const inner = (
    <div className="stat-card h-full">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{value}</p>
      {href && (
        <p className="stat-footer flex items-center gap-1">
          {footer} <span aria-hidden>→</span>
        </p>
      )}
    </div>
  );
  return href
    ? <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>
    : <>{inner}</>;
}

function EmptyChart() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height: '160px', fontSize: '0.8125rem', color: 'var(--muted-2)' }}
    >
      No data available.
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
