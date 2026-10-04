import { createClient } from '@/utils/supabase/server';
import RiskTipsSection, { type AtRiskMother } from '@/components/tips/RiskTipsSection';
import { getMatchedRiskTips, type RiskIndicatorInput } from '@/utils/matchedRiskTips';
import { one } from '@/utils/embedded';
import RiskBadge from '@/components/ui/RiskBadge';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import HighlightedBannerCard from '@/components/ui/HighlightedBannerCard';
import Link from 'next/link';
import { HeartPulse, Users, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight, ChevronRight } from 'lucide-react';

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
      <div className="space-y-6">
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
    <div className="space-y-6 anim-fade-up">
      {/* Page header */}
      <PageHeader
        title="Nurse Dashboard"
        subtitle={`Clinical monitoring and risk management for ${today}`}
        icon={HeartPulse}
        badge="Clinical Staff"
      />

      {/* Highlighted Banner Card */}
      <HighlightedBannerCard
        title="Clinical Assessment & Care Management"
        description="Review active risk indicators, manage clinical protocols, and evaluate registered pregnant mothers across all barangay puroks."
        buttonText="Manage Risk Indicators"
        href="/dashboard/risk-indicators"
        badgeText="Clinical Care"
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered"
          value={total}
          trend={`${total} total patients`}
          icon={Users}
          variant="brand"
          href="/dashboard/pregnant"
          footerText="View all records"
        />
        <StatCard
          title="High Risk Cases"
          value={highRisk}
          trend={`${highRisk} priority cases`}
          icon={AlertTriangle}
          variant="danger"
          href="/dashboard/risk-list/high"
          footerText="View high risk list"
        />
        <StatCard
          title="Low Risk Cases"
          value={lowRisk}
          trend={`${lowRisk} standard cases`}
          icon={ShieldCheck}
          variant="success"
          href="/dashboard/risk-list/low"
          footerText="View low risk list"
        />
        <StatCard
          title="Unassessed"
          value={unassessed}
          trend={`${unassessed} pending evaluation`}
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
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pregnant Women Records</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Comprehensive patient list and clinical status</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-[var(--brand)] border border-teal-200/60 self-start sm:self-auto">
            {total} Registered
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Serial No.</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Age</th>
                <th className="py-3.5 px-4">Purok</th>
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {(!records || records.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                    No pregnant mothers registered yet.
                  </td>
                </tr>
              )}
              {records?.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-500">{r.serial_no ?? '—'}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{r.age ?? '—'}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{r.purok ? `Zone ${r.purok}` : '—'}</td>
                  <td className="py-3.5 px-4">
                    <RiskBadge riskLevel={r.risk_level} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/dashboard/pregnant/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
                    >
                      View Details
                      <ChevronRight size={14} />
                    </Link>
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
