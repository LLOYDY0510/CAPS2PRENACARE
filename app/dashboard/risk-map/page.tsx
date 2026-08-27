import { createClient } from '@/utils/supabase/server';
import RiskMapClient from '@/components/RiskMapClient';

export const dynamic = 'force-dynamic';

export default async function RiskMapPage() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, purok, risk_level, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Risk Map</h1>
      <p className="text-muted mb-6">
        Overview of pregnant mothers by risk level per purok.
      </p>

      <RiskMapClient records={records ?? []} />
    </div>
  );
}