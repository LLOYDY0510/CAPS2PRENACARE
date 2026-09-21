import RiskMapClient from '@/components/maps/RiskMapClient';
import { requireRoles } from '@/utils/auth/roles';
import { canEditRiskMap } from '@/utils/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function RiskMapPage() {
  const { supabase, profile, role } = await requireRoles(['admin', 'nurse', 'bhw_head', 'bhw_purok']);

  let recordsQuery = supabase
    .from('pregnant_mothers')
        .select('id, serial_no, full_name, purok, age, address, contact_number, lmp, edd, gravida_para, risk_level, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  if (role === 'bhw_purok' && profile?.purok) recordsQuery = recordsQuery.eq('purok', profile.purok);
  const { data: records } = await recordsQuery;

  const canEdit = canEditRiskMap(role);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Risk Map</h1>
      <p className="text-muted mb-6">
        Overview of pregnant mothers by risk level per purok.
        {!canEdit && ' (View Only)'}
      </p>

      <RiskMapClient records={records ?? []} />
    </div>
  );
}