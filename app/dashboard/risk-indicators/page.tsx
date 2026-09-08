import { createClient } from '@/utils/supabase/server';
import IndicatorManager from '@/components/tips/IndicatorManager';

export const dynamic = 'force-dynamic';

export default async function RiskIndicatorsPage() {
  const supabase = await createClient();

  const { data: indicators } = await supabase
    .from('risk_indicators')
    .select('id, label, indicator_type, threshold_value, active')
    .order('created_at', { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Risk Indicators</h1>
        <p className="text-muted">
          Manage checklist indicators and automated thresholds used to determine pregnancy risk levels.
        </p>
      </div>

      <IndicatorManager initialIndicators={indicators ?? []} />
    </div>
  );
}
