import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import RiskBadge from '@/components/ui/RiskBadge';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Link from 'next/link';
import { Users, AlertTriangle, ShieldCheck, UserCheck, ArrowRight, LayoutDashboard } from 'lucide-react';

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

export default async function BhwHeadDashboard() {
  const supabase = await createClient();

  const { data: records, error: recordsError } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, full_name, purok, risk_level, age, lmp, gravida_para, date_registered'
    )
    .order('date_registered', { ascending: false });

  const { count: bhwCount, error: bhwCountError } = await createAdminClient()
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'bhw_purok');

  const loadError = recordsError ?? bhwCountError;
  if (loadError) {
    return (
      <div>
        <PageHeader title="BHW Head Dashboard" icon={LayoutDashboard} />
        <div className="alert-error" role="alert">
          Failed to load dashboard data: {loadError.message}
        </div>
      </div>
    );
  }

  const total    = records?.length ?? 0;
  const highRisk = records?.filter((r) => r.risk_level === 'high').length ?? 0;
  const lowRisk  = records?.filter((r) => r.risk_level === 'low').length ?? 0;

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

  const highPct = total > 0 ? Math.round((highRisk / total) * 100) : 0;
  const lowPct  = total > 0 ? 100 - highPct : 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="BHW Head Dashboard"
        subtitle={`Barangay health worker management overview for ${today}`}
        icon={LayoutDashboard}
        badge="Manager"
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered"
          value={total}
          trend="+100% barangay coverage"
          icon={Users}
          variant="brand"
          href="/dashboard/pregnant"
          footerText="View all records"
        />
        <StatCard
          title="High Risk Cases"
          value={highRisk}
          trend={`${highPct}% of total mothers`}
          icon={AlertTriangle}
          variant="danger"
          href="/dashboard/risk-list/high"
          footerText="View high risk list"
        />
        <StatCard
          title="Low Risk Cases"
          value={lowRisk}
          trend={`${lowPct}% of total mothers`}
          icon={ShieldCheck}
          variant="success"
          href="/dashboard/risk-list/low"
          footerText="View low risk list"
        />
        <StatCard
          title="BHW Members"
          value={bhwCount ?? 0}
          trend="Field workers active"
          icon={UserCheck}
          variant="warning"
          href="/dashboard/bhw"
          footerText="Manage BHW team"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart — records per zone */}
        <div className="rounded-[16px] bg-white border border-[var(--border-light)] p-6 shadow-card lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border-light)]">
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">Records per Zone</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Barangay purok distribution</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--border-light)]">
              {total} total
            </span>
          </div>

          {purokEntries.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex items-end gap-3 sm:gap-4 pt-4" style={{ height: '180px' }}>
              {purokEntries.map(([purok, count]) => {
                const barH = Math.max(12, (count / maxPurokCount) * 140);
                return (
                  <div key={purok} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                    <span className="text-xs font-bold text-[var(--ink)] opacity-90 group-hover:scale-110 transition-transform">
                      {count}
                    </span>
                    <div
                      className="w-full max-w-[42px] rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-xs"
                      style={{ height: `${barH}px`, background: ZONE_COLORS[purok] ?? UNASSIGNED_COLOR }}
                    />
                    <span className="text-xs font-medium text-[var(--muted)]">P{purok}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Donut — risk distribution */}
        <div className="rounded-[16px] bg-white border border-[var(--border-light)] p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border-light)]">
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">Risk Breakdown</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Clinical risk ratio</p>
            </div>
          </div>

          {total === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border-light)" strokeWidth="12"/>
                  <circle
                    cx="50" cy="50" r="38" fill="none"
                    stroke="var(--success)" strokeWidth="12"
                    strokeDasharray={`${(lowPct / 100) * 238.8} 238.8`}
                    strokeLinecap={lowPct === 100 ? 'butt' : 'round'}
                    className="transition-all duration-500"
                  />
                  {highPct > 0 && (
                    <circle
                      cx="50" cy="50" r="38" fill="none"
                      stroke="var(--danger)" strokeWidth="12"
                      strokeDasharray={`${(highPct / 100) * 238.8} 238.8`}
                      strokeDashoffset={`${-(lowPct / 100) * 238.8}`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold text-[var(--ink)]">{total}</span>
                  <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Mothers</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 mt-6 w-full pt-4 border-t border-[var(--border-light)]">
                <Legend color="var(--success)" label="Low Risk" pct={`${lowPct}%`} />
                <Legend color="var(--danger)" label="High Risk" pct={`${highPct}%`} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Age group chart */}
      <div className="rounded-[16px] bg-white border border-[var(--border-light)] p-6 shadow-card">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border-light)]">
          <div>
            <h2 className="text-base font-bold text-[var(--ink)]">Registered by Age Group</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Demographic risk profiling</p>
          </div>
          <span className="text-xs font-medium text-[var(--muted)]">{total} total</span>
        </div>

        {total === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex items-end gap-8 sm:gap-16 justify-center py-4" style={{ height: '180px' }}>
            {AGE_GROUPS.map((group) => {
              const count = byAgeGroup[group];
              const barH  = Math.max(12, (count / maxAgeCount) * 140);
              return (
                <div key={group} className="flex flex-col items-center justify-end h-full gap-2 group" style={{ width: '80px' }}>
                  <span className="text-xs font-bold text-[var(--ink)] opacity-90 group-hover:scale-110 transition-transform">
                    {count}
                  </span>
                  <div
                    className="w-14 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    style={{ height: `${barH}px`, background: AGE_GROUP_COLORS[group] }}
                  />
                  <span className="text-xs font-medium text-[var(--muted)]">{group} yrs</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent records table */}
      <div className="rounded-[16px] bg-white border border-[var(--border-light)] shadow-card overflow-hidden">
        <div className="p-5 border-b border-[var(--border-light)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--ink)]">Recent Registrations</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Latest maternal records logged</p>
          </div>
          <Link
            href="/dashboard/pregnant"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
          >
            <span>View all</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
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
                  <td colSpan={8} className="text-center py-8 text-muted-2">
                    No records yet.
                  </td>
                </tr>
              )}
              {recentRecords.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                  <td data-label="Serial No." className="font-mono text-xs text-[var(--muted)]">{r.serial_no ?? '—'}</td>
                  <td data-label="Name" className="font-semibold text-[var(--ink)]">{r.full_name ?? '—'}</td>
                  <td data-label="Zone">{r.purok ? `Zone ${r.purok}` : '—'}</td>
                  <td data-label="Age">{r.age ?? '—'}</td>
                  <td data-label="LMP">{r.lmp ?? '—'}</td>
                  <td data-label="G-P">{r.gravida_para ?? '—'}</td>
                  <td data-label="Risk">
                    <RiskBadge riskLevel={r.risk_level} />
                  </td>
                  <td data-label="Date Registered" className="text-xs text-[var(--muted)]">{r.date_registered ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-xs font-medium text-[var(--muted-2)]">
      No data available.
    </div>
  );
}

function Legend({ color, label, pct }: { color: string; label: string; pct: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <span className="text-xs font-bold text-[var(--ink)]">{pct}</span>
    </div>
  );
}
