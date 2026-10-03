import { createClient } from '@/utils/supabase/server';
import RiskTipsSection, { type AtRiskMother } from '@/components/tips/RiskTipsSection';
import { getMatchedRiskTips, type RiskIndicatorInput } from '@/utils/matchedRiskTips';
import { one } from '@/utils/embedded';
import RiskBadge from '@/components/ui/RiskBadge';

type MotherIndicatorRow = {
  pregnant_mother_id: string | null;
  risk_indicators: RiskIndicatorInput | RiskIndicatorInput[] | null;
};

export default async function NurseDashboard() {
  const supabase = await createClient();

  // 1. Fetch pregnant mothers
  const { data: records, error: recordsError } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, first_name, middle_name, last_name, full_name, age, purok, risk_level, lmp, contact_number, blood_pressure, gravida_para'
    )
    .order('serial_no', { ascending: true });

  // 2. Fetch active risk indicators
  const { data: indicators, error: indicatorsError } = await supabase
    .from('risk_indicators')
    .select('id, label, indicator_type, threshold_value, active')
    .eq('active', true)
    .order('created_at', { ascending: true });

  // 3. Fetch matched indicators from junction table
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
        <div className="page-header">
          <h1>Nurse Dashboard</h1>
        </div>
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
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Nurse Dashboard</h1>
        <p className="page-date">{today}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="stat-label">Total Registered</p>
          <p className="stat-value">{total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">High Risk</p>
          <p className="stat-value" style={{ color: 'var(--danger)' }}>{highRisk}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Low Risk</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>{lowRisk}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Unassessed</p>
          <p className="stat-value" style={{ color: 'var(--muted)' }}>{unassessed}</p>
        </div>
      </div>

      {/* Risk tips section — unchanged functionality */}
      <RiskTipsSection
        mothers={atRiskMothers}
        availableIndicators={activeIndicatorsList.map((i) => ({ id: i.id, label: i.label }))}
      />

      {/* Records table */}
      <div className="card overflow-x-auto mt-4">
        <div className="section-header">
          <h2>Pregnant Women Records</h2>
          <span className="text-xs text-muted">{total} registered</span>
        </div>
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
              <tr key={r.id}>
                <td data-label="Serial No.">{r.serial_no ?? '—'}</td>
                <td data-label="Name" className="font-medium text-ink">
                  {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td data-label="Age">{r.age ?? '—'}</td>
                <td data-label="Purok">{r.purok ?? '—'}</td>
                <td data-label="Risk Level">
                  <RiskBadge riskLevel={r.risk_level} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
