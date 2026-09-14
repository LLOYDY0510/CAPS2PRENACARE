import { createClient } from '@/utils/supabase/server';
import RiskTipsSection, { type AtRiskMother, type MatchedIndicatorDetail } from '@/components/tips/RiskTipsSection';
import { getRiskTipForIndicator } from '@/utils/riskTips';
import { requireRoles } from '@/utils/auth/roles';

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

  const indicatorsByMotherId: Record<string, { id: string; label: string; indicator_type: string; threshold_value: number | null }[]> = {};
  motherIndicators?.forEach((item: any) => {
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
    const matchedIndicators: MatchedIndicatorDetail[] = [];
    const seenIds = new Set<string>();
    const addIndicator = (indicator: { id: string; label: string; indicator_type: string; threshold_value: number | null }) => {
      if (seenIds.has(indicator.id)) return;
      seenIds.add(indicator.id);
      const tip = getRiskTipForIndicator(indicator.label, indicator.indicator_type, indicator.threshold_value);
      matchedIndicators.push({ id: indicator.id, label: indicator.label, indicatorType: indicator.indicator_type, thresholdValue: indicator.threshold_value, ...tip });
    };

    (indicatorsByMotherId[mother.id] ?? []).forEach(addIndicator);
    const isFirstPregnancy = mother.gravida_para?.toLowerCase().startsWith('g1') ?? false;
    activeIndicators.forEach((indicator) => {
      const ageMatches = indicator.indicator_type === 'age_below' && mother.age != null && indicator.threshold_value != null && mother.age < indicator.threshold_value;
      const firstPregnancyMatches = indicator.indicator_type === 'first_pregnancy_age_above' && mother.age != null && isFirstPregnancy && indicator.threshold_value != null && mother.age >= indicator.threshold_value;
      if (ageMatches || firstPregnancyMatches) addIndicator(indicator);
    });

    if (mother.risk_level === 'high' && matchedIndicators.length === 0) {
      const label = mother.blood_pressure ? `High Blood Pressure (${mother.blood_pressure})` : 'High Risk Case';
      const tip = getRiskTipForIndicator(label, 'checklist', null);
      matchedIndicators.push({ id: `general-${mother.id}`, label, indicatorType: 'checklist', thresholdValue: null, ...tip });
    }

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
