import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
 
const ZONE_COLORS: Record<string, string> = {
  '1': '#00ffee',
  '2': '#3977ff',
  '3': '#63f80d',
  '4': '#fbff20',
  '5': '#ff0404',
  '6': '#c700da',
  '7': '#ff6aad',
  '8': '#ff8a03',
};
const UNASSIGNED_COLOR = '#9CA3AF';
 
const AGE_GROUP_COLORS: Record<string, string> = {
  '10-14': '#ffef0a',
  '15-19': '#4bfc28',
  '20-49': '#2237f1',
};
 
export default async function AdminDashboard() {
  const supabase = await createClient();
 
  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, full_name, purok, risk_level, age, lmp, gravida_para, date_registered'
    )
    .order('date_registered', { ascending: false });
 
  const total = records?.length ?? 0;
  const highRisk = records?.filter((r) => r.risk_level === 'high').length ?? 0;
  const lowRisk = records?.filter((r) => r.risk_level === 'low').length ?? 0;
 
  const byPurok: Record<string, number> = {};
  records?.forEach((r) => {
    const p = r.purok || 'Unassigned';
    byPurok[p] = (byPurok[p] || 0) + 1;
  });
  const purokEntries = Object.entries(byPurok).sort((a, b) => a[0].localeCompare(b[0]));
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
 
  const { data: profiles } = await supabase
    .from('profiles')
    .select('role');
 
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
  const lowPct = total > 0 ? 100 - highPct : 0;
 
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Admin Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">{today}</p>
        </div>
      </div>
 
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <KpiCard
          label="Total Registered"
          value={total}
          icon="👥"
          iconBg="bg-brand-light"
          href="/dashboard/pregnant"
          footerLabel="View all records"
        />
        <KpiCard
          label="High Risk"
          value={highRisk}
          icon="⚠️"
          iconBg="bg-red-50"
          valueColor="text-red-600"
          href="/dashboard/risk-list/high"
        />
        <KpiCard
          label="Low Risk"
          value={lowRisk}
          icon="✅"
          iconBg="bg-green-50"
          valueColor="text-green-600"
          href="/dashboard/risk-list/low"
        />
        <KpiCard
          label="Staff Accounts"
          value={totalStaff}
          icon="🩺"
          iconBg="bg-amber-50"
          valueColor="text-amber-600"
          href="/dashboard/users"
        />
      </div>
 
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-700">Records per Zone</h2>
            <span className="text-xs text-muted-2">{total} total</span>
          </div>
 
          {purokEntries.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-2">
              No records yet.
            </div>
          ) : (
            <div className="flex items-end gap-4" style={{ height: '180px' }}>
              {purokEntries.map(([purok, count]) => {
                const barHeight = Math.max(6, (count / maxPurokCount) * 150);
                return (
                  <div
                    key={purok}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-2"
                  >
                    <span className="text-xs font-medium text-gray-700">{count}</span>
                    <div
                      className="w-full max-w-[44px] rounded-t-md"
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: ZONE_COLORS[purok] ?? UNASSIGNED_COLOR,
                      }}
                    />
                    <span className="text-xs text-muted">P{purok}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
 
        {/* Donut chart */}
        <div className="card p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700 mb-6">Risk Distribution</h2>
 
          {total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-2">
              No data yet.
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F4" strokeWidth="14" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#04db53"
                  strokeWidth="14"
                  strokeDasharray={`${(lowPct / 100) * 251.2} 251.2`}
                  strokeLinecap={lowPct === 100 ? 'butt' : 'round'}
                />
                {highPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#fc0a0a"
                    strokeWidth="14"
                    strokeDasharray={`${(highPct / 100) * 251.2} 251.2`}
                    strokeDashoffset={`${-(lowPct / 100) * 251.2}`}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="flex gap-5 mt-5 text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
                  Low {lowPct}%
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                  High {highPct}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
 
      {/* Age group chart */}
      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-gray-700">Pregnant Women by Age Group</h2>
          <span className="text-xs text-muted-2">{total} total</span>
        </div>
 
        {total === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-2">
            No records yet.
          </div>
        ) : (
          <div className="flex items-end gap-8 justify-center" style={{ height: '180px' }}>
            {AGE_GROUPS.map((group) => {
              const count = byAgeGroup[group];
              const barHeight = Math.max(6, (count / maxAgeCount) * 150);
              return (
                <div
                  key={group}
                  className="flex flex-col items-center justify-end h-full gap-2"
                  style={{ width: '80px' }}
                >
                  <span className="text-xs font-medium text-gray-700">{count}</span>
                  <div
                    className="w-full max-w-[56px] rounded-t-md"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: AGE_GROUP_COLORS[group],
                    }}
                  />
                  <span className="text-xs text-muted">{group}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
 
      {/* Recent registered pregnant women */}
      <div className="card overflow-x-auto mb-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Recent Pregnant Women's</h2>
          <Link href="/dashboard/pregnant" className="text-xs text-brand hover:underline">
            View all records
          </Link>
        </div>
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b text-left text-muted">
            <tr>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">LMP</th>
              <th className="px-4 py-3">G-P</th>
              <th className="px-4 py-3">Risk Level</th>
              <th className="px-4 py-3">Date Registered</th>
            </tr>
          </thead>
          <tbody>
            {recentRecords.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-2">
                  No pregnant mothers registered yet.
                </td>
              </tr>
            )}
            {recentRecords.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted font-mono text-xs">{r.serial_no ?? '—'}</td>
                <td className="px-4 py-3 font-medium">{r.full_name ?? '—'}</td>
                <td className="px-4 py-3">{r.purok ?? '—'}</td>
                <td className="px-4 py-3">{r.age ?? '—'}</td>
                <td className="px-4 py-3">{r.lmp ?? '—'}</td>
                <td className="px-4 py-3">{r.gravida_para ?? '—'}</td>
                <td className="px-4 py-3">
                  {r.risk_level === 'high' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      High Risk
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Low Risk
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{r.date_registered ?? '—'}</td>
                <td className="px-4 py-3">
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {/* Staff by role */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Staff by Role</h2>
        {Object.keys(byRole).length === 0 ? (
          <div className="text-sm text-muted-2">No accounts yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(byRole)
              .filter(([role]) => role !== 'pregnant_mother')
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between border rounded-lg px-4 py-3"
                >
                  <span className="text-sm text-muted">
                    {roleLabels[role] ?? role}
                  </span>
                  <span className="text-lg font-semibold text-ink">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
 
function KpiCard({
  label,
  value,
  icon,
  iconBg,
   valueColor = 'text-ink',
  href,
  footerLabel = 'View details',
}: {
  label: string;
  value: number;
  icon: string;
  iconBg: string;
  valueColor?: string;
  href?: string;
  footerLabel?: string;
}) {
  const content = (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center text-sm`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-semibold ${valueColor}`}>{value}</p>
      {href && (
        <p className="text-xs text-ink mt-3 pt-3 border-t border-gray-100 flex items-center gap-1">
          {footerLabel} <span aria-hidden>→</span>
        </p>
      )}
    </div>
  );
 
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition">
        {content}
      </Link>
    );
  }
 
  return content;
}