import { createClient } from '@/utils/supabase/server';
import RiskTipsSection, { type AtRiskMother } from '@/components/tips/RiskTipsSection';
import { getMatchedRiskTips, type RiskIndicatorInput } from '@/utils/matchedRiskTips';
import { one } from '@/utils/embedded';
import RiskBadge from '@/components/ui/RiskBadge';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { HeartPulse, Users, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

type MotherIndicatorRow = {
  pregnant_mother_id: string | null;
  risk_indicators: RiskIndicatorInput | RiskIndicatorInput[] | null;
};

export default async function NurseDashboard() {
  const supabase = await createClient();

  const { data: records, error: recordsError } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, first_name, middle_name, last_name, full_name, age, purok, risk_level, lmp, contact_number, blood_pressure, gravida_para'
    )
    .order('serial_no', { ascending: true });

  const { data: indicators, error: indicatorsError } = await supabase
    .from('risk_indicators')
    .select('id, label, indicator_type, threshold_value, active')
    .eq('active', true)
    .order('created_at', { ascending: true });

  const { data: motherIndicators, error: linksError } = await supabase
    .from('pregnant_mother_indicators')
    .select(`
      pregnant_mother_id,
      indicator_id,
      risk_indicators (
        id,
        label,
        indicator_type,
        threshold_value
      )
    `);

  const loadError = recordsError ?? indicatorsError ?? linksError;
  if (loadError) {
    return (
      <div>
        <PageHeader title="Nurse Dashboard" icon={HeartPulse} />
        <div className="alert-error" role="alert">
          Failed to load dashboard data: {loadError.message}
        </div>
      </div>
    );
  }

  const activeIndicatorsList = indicators ?? [];

  const indicatorsByMotherId: Record<string, RiskIndicatorInput[]> = {};
  motherIndicators?.forEach((item: MotherIndicatorRow) => {
    const motherId = item.pregnant_mother_id;
    const ind = one(item.risk_indicators);
    if (motherId && ind) {
      if (!indicatorsByMotherId[motherId]) indicatorsByMotherId[motherId] = [];
      if (!indicatorsByMotherId[motherId].some((x) => x.id === ind.id)) {
        indicatorsByMotherId[motherId].push({
          id: ind.id,
          label: ind.label,
          indicator_type: ind.indicator_type,
          threshold_value: ind.threshold_value,
        });
      }
    }
  });

  const atRiskMothers: AtRiskMother[] = [];

  (records ?? []).forEach((mother) => {
    const matchedList = getMatchedRiskTips(mother, activeIndicatorsList, indicatorsByMotherId[mother.id] ?? []);

    if (matchedList.length > 0 || mother.risk_level === 'high') {
      atRiskMothers.push({
        id: mother.id,
        serialNo: mother.serial_no,
        fullName:
          mother.full_name ||
          [mother.first_name, mother.middle_name, mother.last_name].filter(Boolean).join(' ') ||
          'Unnamed Mother',
        age: mother.age,
        purok: mother.purok,
        bloodPressure: mother.blood_pressure,
        contactNumber: mother.contact_number,
        riskLevel: mother.risk_level,
        matchedIndicators: matchedList,
      });
    }
  });

  const total    = records?.length ?? 0;
  const highRisk = records?.filter((r) => r.risk_level === 'high').length ?? 0;
  const lowRisk  = records?.filter((r) => r.risk_level === 'low').length ?? 0;
  const unassessed = records?.filter((r) => !r.risk_level).length ?? 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Nurse Dashboard"
        subtitle={`Clinical monitoring and risk management for ${today}`}
        icon={HeartPulse}
        badge="Clinical Staff"
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered"
          value={total}
          trend="Registered patients"
          icon={Users}
          variant="brand"
          href="/dashboard/pregnant"
          footerText="View all records"
        />
        <StatCard
          title="High Risk Cases"
          value={highRisk}
          trend="Requires clinical intervention"
          icon={AlertTriangle}
          variant="danger"
          href="/dashboard/risk-list/high"
          footerText="View high risk list"
        />
        <StatCard
          title="Low Risk Cases"
          value={lowRisk}
          trend="Routine prenatal care"
          icon={ShieldCheck}
          variant="success"
          href="/dashboard/risk-list/low"
          footerText="View low risk list"
        />
        <StatCard
          title="Unassessed"
          value={unassessed}
          trend="Pending risk evaluation"
          icon={HelpCircle}
          variant="warning"
          href="/dashboard/pregnant"
          footerText="Review records"
        />
      </div>

      {/* Risk tips section */}
      <RiskTipsSection
        mothers={atRiskMothers}
        availableIndicators={activeIndicatorsList.map((i) => ({ id: i.id, label: i.label }))}
      />

      {/* Records table */}
      <div className="rounded-[16px] bg-white border border-[var(--border-light)] shadow-card overflow-hidden">
        <div className="p-5 border-b border-[var(--border-light)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--ink)]">Pregnant Women Records</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Comprehensive patient list</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--border-light)]">
            {total} registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Serial No.</th>
                <th>Name</th>
                <th>Age</th>
                <th>Purok</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {(!records || records.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-2">
                    No pregnant mothers registered yet.
                  </td>
                </tr>
              )}
              {records?.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--surface-alt)] transition-colors">
                  <td data-label="Serial No." className="font-mono text-xs text-[var(--muted)]">{r.serial_no ?? '—'}</td>
                  <td data-label="Name" className="font-semibold text-[var(--ink)]">
                    {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td data-label="Age">{r.age ?? '—'}</td>
                  <td data-label="Purok">{r.purok ? `Zone ${r.purok}` : '—'}</td>
                  <td data-label="Risk Level">
                    <RiskBadge riskLevel={r.risk_level} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
