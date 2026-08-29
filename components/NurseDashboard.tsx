import { createClient } from '@/utils/supabase/server';
import IndicatorManager from '@/components/IndicatorManager';
import MonthlyTipsManager from '@/components/MonthlyTipsManager';
 
export default async function NurseDashboard() {
  const supabase = await createClient();
 
  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, serial_no, first_name, middle_name, last_name, age, purok, risk_level, lmp')
    .order('serial_no', { ascending: true });
 
  const { data: indicators } = await supabase
    .from('risk_indicators')
    .select('id, label, indicator_type, threshold_value, active')
    .order('created_at', { ascending: true });
 
  const { data: monthlyTips } = await supabase
    .from('monthly_tips')
    .select('id, month, risk_level, title, content')
    .order('month', { ascending: true })
    .order('risk_level', { ascending: true });
 
  const { data: broadcasts } = await supabase
    .from('tip_broadcasts')
    .select('id, month, risk_level, period, title, content, status, created_at, approved_at, sent_at')
    .order('created_at', { ascending: false });
 
  const broadcastIds = broadcasts?.map((b) => b.id) ?? [];
  const { data: recipients } = broadcastIds.length
    ? await supabase
        .from('tip_broadcast_recipients')
        .select('broadcast_id, pregnant_mother_id, sent, pregnant_mothers(full_name)')
        .in('broadcast_id', broadcastIds)
    : { data: [] };
 
  const total = records?.length ?? 0;
  const highRisk = records?.filter((r) => r.risk_level === 'high').length ?? 0;
  const lowRisk = records?.filter((r) => r.risk_level === 'low').length ?? 0;
 
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
 
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Nurse Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">{today}</p>
        </div>
      </div>
 
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted">Total Registered</span>
            <span className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center text-sm">👥</span>
          </div>
          <p className="text-3xl font-semibold text-ink">{total}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted">High Risk</span>
            <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm">⚠️</span>
          </div>
          <p className="text-3xl font-semibold text-red-600">{highRisk}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted">Low Risk</span>
            <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-sm">✅</span>
          </div>
          <p className="text-3xl font-semibold text-green-600">{lowRisk}</p>
        </div>
      </div>
 
      {/* Risk indicators management */}
      <IndicatorManager initialIndicators={indicators ?? []} />
 
      {/* Monthly nutrition & health tips */}
      <div className="mt-6">
        <MonthlyTipsManager
          monthlyTips={monthlyTips ?? []}
          pregnantMothers={records ?? []}
          broadcasts={broadcasts ?? []}
          recipients={recipients ?? []}
        />
      </div>
 
      {/* Records table */}
      <div className="card overflow-x-auto mt-6">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Pregnant Women Records</h2>
        </div>
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b text-left text-muted">
            <tr>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Purok</th>
              <th className="px-4 py-3">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {(!records || records.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-2">
                  No pregnant mothers registered yet.
                </td>
              </tr>
            )}
            {records?.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted font-mono text-xs">{r.serial_no ?? '—'}</td>
                <td className="px-4 py-3 font-medium">
                  {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-3">{r.age ?? '—'}</td>
                <td className="px-4 py-3">{r.purok ?? '—'}</td>
                <td className="px-4 py-3">
                  {r.risk_level === 'high' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      ⚠️ High Risk
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      ✅ Low Risk
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}