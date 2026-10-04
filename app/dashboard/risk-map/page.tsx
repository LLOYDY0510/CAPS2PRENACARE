import RiskMapClient from '@/components/maps/RiskMapClient';
import { requireRoles } from '@/utils/auth/roles';
import { canEditRiskMap } from '@/utils/auth/permissions';
import PageHeader from '@/components/ui/PageHeader';
import { Map } from 'lucide-react';

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
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        title="Geographic Risk Map"
        subtitle={
          canEdit
            ? 'Geographic distribution and risk levels of pregnant mothers per purok'
            : 'Geographic distribution (View Only)'
        }
        icon={Map}
        badge="Zone Intelligence"
      />

      <RiskMapClient records={records ?? []} />
    </div>
  );
}