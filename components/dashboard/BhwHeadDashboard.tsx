import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import RiskBadge from '@/components/ui/RiskBadge';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import HighlightedBannerCard from '@/components/ui/HighlightedBannerCard';
import Link from 'next/link';
import { Users, AlertTriangle, ShieldCheck, UserCheck, ArrowRight, LayoutDashboard, ChevronRight, MoreVertical } from 'lucide-react';

const ZONE_COLORS: Record<string, string> = {
  '1': '#3B82F6',
  '2': '#2A7A74',
  '3': '#8B5CF6',
  '4': '#F59E0B',
  '5': '#EF4444',
  '6': '#EC4899',
  '7': '#10B981',
  '8': '#F97316',
};
const UNASSIGNED_COLOR = '#CBD5E1';

const AGE_GROUP_COLORS: Record<string, string> = {
  '10-14': '#F59E0B',
  '15-19': '#2A7A74',
  '20-49': '#3B82F6',
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
      <div className="space-y-6">
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
    <div className="space-y-6 anim-fade-up">
      {/* Page header */}
      <PageHeader
        title="BHW Head Dashboard"
        subtitle={`Barangay health worker management overview for ${today}`}
        icon={LayoutDashboard}
        badge="Manager"
      />

      {/* Highlighted Banner Card */}
      <HighlightedBannerCard
        title="Barangay Care Operations"
        description="Coordinate BHW purok visits, schedule upcoming prenatal checkups, and monitor high-risk pregnancies across all zones."
        buttonText="View Schedule"
        href="/dashboard/schedule"
        badgeText="Manager Portal"
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
        <div className="card rounded-[24px] bg-white p-6 shadow-card border border-slate-100 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Records per Zone</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Barangay purok distribution</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                {total} total
              </span>
              <button type="button" aria-label="Options" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {purokEntries.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex items-end gap-3 sm:gap-4 pt-4" style={{ height: '200px' }}>
              {purokEntries.map(([purok, count]) => {
                const barH = Math.max(16, (count / maxPurokCount) * 150);
                return (
                  <div key={purok} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                    <span className="text-xs font-bold text-slate-700 opacity-90 group-hover:scale-110 transition-transform">
                      {count}
                    </span>
                    <div
                      className="w-full max-w-[44px] rounded-t-2xl transition-all duration-300 group-hover:brightness-110 shadow-xs"
                      style={{ height: `${barH}px`, background: ZONE_COLORS[purok] ?? UNASSIGNED_COLOR }}
                    />
                    <span className="text-xs font-bold text-slate-500">P{purok}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Donut — risk distribution */}
        <div className="card rounded-[24px] bg-white p-6 shadow-card border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Risk Breakdown</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Clinical risk ratio</p>
            </div>
            <button type="button" aria-label="Options" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <MoreVertical size={16} />
            </button>
          </div>

          {total === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="12"/>
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
                  <span className="text-2xl font-extrabold text-slate-800">{total}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mothers</span>
                </div>
              </div>

              <div className="w-full mt-6 space-y-2 pt-4 border-t border-slate-100">
                <LegendRow color="var(--success)" label="Low Risk" pct={`${lowPct}%`} count={lowRisk} href="/dashboard/risk-list/low" />
                <LegendRow color="var(--danger)" label="High Risk" pct={`${highPct}%`} count={highRisk} href="/dashboard/risk-list/high" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Age group chart */}
      <div className="card rounded-[24px] bg-white p-6 shadow-card border border-slate-100">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Registered by Age Group</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Demographic risk profiling</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{total} total</span>
        </div>

        {total === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex items-end gap-8 sm:gap-16 justify-center py-4" style={{ height: '190px' }}>
            {AGE_GROUPS.map((group) => {
              const count = byAgeGroup[group];
              const barH  = Math.max(16, (count / maxAgeCount) * 140);
              return (
                <div key={group} className="flex flex-col items-center justify-end h-full gap-2 group" style={{ width: '80px' }}>
                  <span className="text-xs font-bold text-slate-700 opacity-90 group-hover:scale-110 transition-transform">
                    {count}
                  </span>
                  <div
                    className="w-16 rounded-t-2xl transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    style={{ height: `${barH}px`, background: AGE_GROUP_COLORS[group] }}
                  />
                  <span className="text-xs font-bold text-slate-500">{group} yrs</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent records table */}
      <div className="card rounded-[24px] bg-white border border-slate-100 shadow-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Recent Registrations</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Latest maternal records logged</p>
          </div>
          <Link
            href="/dashboard/pregnant"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100"
          >
            <span>See all</span>
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
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                    No records yet.
                  </td>
                </tr>
              )}
              {recentRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td data-label="Serial No." className="font-mono text-xs font-bold text-slate-500">{r.serial_no ?? '—'}</td>
                  <td data-label="Name" className="font-bold text-slate-800">{r.full_name ?? '—'}</td>
                  <td data-label="Zone">{r.purok ? `Zone ${r.purok}` : '—'}</td>
                  <td data-label="Age">{r.age ?? '—'}</td>
                  <td data-label="LMP">{r.lmp ?? '—'}</td>
                  <td data-label="G-P">{r.gravida_para ?? '—'}</td>
                  <td data-label="Risk">
                    <RiskBadge riskLevel={r.risk_level} />
                  </td>
                  <td data-label="Date Registered" className="text-xs font-medium text-slate-500">{r.date_registered ?? '—'}</td>
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
    <div className="flex items-center justify-center h-40 text-xs font-semibold text-slate-400">
      No data available.
    </div>
  );
}

function LegendRow({ color, label, pct, count, href }: { color: string; label: string; pct: string; count: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-2.5">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-xs font-bold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold text-slate-800">{count} ({pct})</span>
        <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
