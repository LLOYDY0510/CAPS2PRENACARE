import { createClient } from '@/utils/supabase/server';
import RiskTipsSection, { type AtRiskMother, type MatchedIndicatorDetail } from '@/components/tips/RiskTipsSection';
import { getRiskTipForIndicator } from '@/utils/riskTips';

export default async function NurseDashboard() {
  const supabase = await createClient();

  // 1. Fetch pregnant mothers
  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, first_name, middle_name, last_name, full_name, age, purok, risk_level, lmp, contact_number, blood_pressure, gravida_para'
    )
    .order('serial_no', { ascending: true });

  // 2. Fetch active risk indicators
  const { data: indicators } = await supabase
    .from('risk_indicators')
    .select('id, label, indicator_type, threshold_value, active')
    .eq('active', true)
    .order('created_at', { ascending: true });

  // 3. Fetch matched indicators from junction table
  const { data: motherIndicators } = await supabase
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

  const activeIndicatorsList = indicators ?? [];

  const indicatorsByMotherId: Record<string, { id: string; label: string; indicator_type: string; threshold_value: number | null }[]> = {};
  motherIndicators?.forEach((item: any) => {
    const motherId = item.pregnant_mother_id;
    const ind = Array.isArray(item.risk_indicators) ? item.risk_indicators[0] : item.risk_indicators;
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
    const matchedList: MatchedIndicatorDetail[] = [];
    const seenIds = new Set<string>();

    // A. Explicitly matched indicators from DB
    const recorded = indicatorsByMotherId[mother.id] ?? [];
    recorded.forEach((ind) => {
      seenIds.add(ind.id);
      const tipData = getRiskTipForIndicator(ind.label, ind.indicator_type, ind.threshold_value);
      matchedList.push({ id: ind.id, label: ind.label, indicatorType: ind.indicator_type, thresholdValue: ind.threshold_value, ...tipData });
    });

    // B. Automatic threshold evaluation
    const ageNum = mother.age;
    const isFirstPregnancy = mother.gravida_para ? mother.gravida_para.toLowerCase().startsWith('g1') : false;

    activeIndicatorsList.forEach((ind) => {
      if (seenIds.has(ind.id)) return;
      let isMatch = false;
      if (ind.indicator_type === 'age_below' && ageNum != null && ind.threshold_value != null && ageNum < ind.threshold_value) {
        isMatch = true;
      } else if (ind.indicator_type === 'first_pregnancy_age_above' && ageNum != null && isFirstPregnancy && ind.threshold_value != null && ageNum >= ind.threshold_value) {
        isMatch = true;
      }
      if (isMatch) {
        seenIds.add(ind.id);
        const tipData = getRiskTipForIndicator(ind.label, ind.indicator_type, ind.threshold_value);
        matchedList.push({ id: ind.id, label: ind.label, indicatorType: ind.indicator_type, thresholdValue: ind.threshold_value, ...tipData });
      }
    });

    // C. Fallback for high-risk with no specific indicator
    if (mother.risk_level === 'high' && matchedList.length === 0) {
      const fallbackTip = getRiskTipForIndicator(
        mother.blood_pressure ? `High Blood Pressure (${mother.blood_pressure})` : 'High Risk Case',
        'checklist', null
      );
      matchedList.push({
        id: `general-${mother.id}`,
        label: mother.blood_pressure ? `Blood Pressure: ${mother.blood_pressure}` : 'High Risk Pregnancy Profile',
        indicatorType: 'checklist',
        thresholdValue: null,
        ...fallbackTip,
      });
    }

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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{total} registered</span>
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
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
                  No pregnant mothers registered yet.
                </td>
              </tr>
            )}
            {records?.map((r) => (
              <tr key={r.id}>
                <td>{r.serial_no ?? '—'}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td>{r.age ?? '—'}</td>
                <td>{r.purok ?? '—'}</td>
                <td>
                  {r.risk_level === 'high'
                    ? <span className="badge-high">High Risk</span>
                    : <span className="badge-low">Low Risk</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
