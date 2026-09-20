import { createClient } from '@/utils/supabase/server';
import RiskTipsSection, { type AtRiskMother } from '@/components/tips/RiskTipsSection';
import { requireRoles } from '@/utils/auth/roles';
import { getMatchedRiskTips, type RiskIndicatorInput } from '@/utils/matchedRiskTips';

type MotherIndicatorRow = {
  pregnant_mother_id: string | null;
  risk_indicators: RiskIndicatorInput | RiskIndicatorInput[] | null;
};

export const dynamic = 'force-dynamic';

export default async function HealthTipsPage() {
  const { supabase } = await requireRoles(['nurse']);

  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, serial_no, first_name, middle_name, last_name, full_name, age, purok, risk_level, contact_number, blood_pressure, gravida_para')
    .order('serial_no', { ascending: true });

  const { data: indicators } = await supabase
    .from('risk_indicators')
    .select('id, label, indicator_type, threshold_value, active')
    .eq('active', true)
    .order('created_at', { ascending: true });

  const { data: motherIndicators } = await supabase
    .from('pregnant_mother_indicators')
    .select('pregnant_mother_id, indicator_id, risk_indicators(id, label, indicator_type, threshold_value)');

  const indicatorsByMotherId: Record<string, RiskIndicatorInput[]> = {};
  motherIndicators?.forEach((item: MotherIndicatorRow) => {
    const indicator = Array.isArray(item.risk_indicators) ? item.risk_indicators[0] : item.risk_indicators;
    if (!item.pregnant_mother_id || !indicator) return;
    if (!indicatorsByMotherId[item.pregnant_mother_id]) indicatorsByMotherId[item.pregnant_mother_id] = [];
    if (!indicatorsByMotherId[item.pregnant_mother_id].some((entry) => entry.id === indicator.id)) {
      indicatorsByMotherId[item.pregnant_mother_id].push(indicator);
    }
  });

  const activeIndicators = indicators ?? [];
  const atRiskMothers: AtRiskMother[] = [];

  (records ?? []).forEach((mother) => {
    const matchedIndicators = getMatchedRiskTips(mother, activeIndicators, indicatorsByMotherId[mother.id] ?? []);

    if (matchedIndicators.length > 0 || mother.risk_level === 'high') {
      atRiskMothers.push({
        id: mother.id,
        serialNo: mother.serial_no,
        fullName: mother.full_name || [mother.first_name, mother.middle_name, mother.last_name].filter(Boolean).join(' ') || 'Unnamed Mother',
        age: mother.age,
        purok: mother.purok,
        bloodPressure: mother.blood_pressure,
        contactNumber: mother.contact_number,
        riskLevel: mother.risk_level,
        matchedIndicators,
      });
    }
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Health Tips</h1>
        <p className="text-muted">
          Automatically generated maternal health advice based on each pregnant mother&apos;s triggered risk indicators.
        </p>
      </div>

      <RiskTipsSection
        mothers={atRiskMothers}
        availableIndicators={activeIndicators.map((indicator) => ({ id: indicator.id, label: indicator.label }))}
      />
    </div>
  );
}
