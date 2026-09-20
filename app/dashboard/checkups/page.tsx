import CheckupsTable from '@/components/pregnant/CheckupsTable';
import { requireRoles } from '@/utils/auth/roles';

export const dynamic = 'force-dynamic';

export default async function PrenatalCheckupsPage() {
  const { supabase, profile, role } = await requireRoles(['admin', 'nurse', 'bhw_head', 'bhw_purok']);

  let recordsQuery = supabase
    .from('pregnant_mothers')
    .select('id, serial_no, first_name, middle_name, last_name, purok, edd')
    .order('serial_no', { ascending: true });
  if (role === 'bhw_purok' && profile?.purok) recordsQuery = recordsQuery.eq('purok', profile.purok);
  const { data: records } = await recordsQuery;

  let checkupQuery = supabase
    .from('prenatal_checkups')
    .select('pregnant_mother_id');
  if (role === 'bhw_purok' && profile?.purok) {
    checkupQuery = checkupQuery.eq('pregnant_mothers.purok', profile.purok);
  }
  const { data: checkupCounts } = await checkupQuery;

  const countsByMother: Record<string, number> = {};
  checkupCounts?.forEach((c) => {
    countsByMother[c.pregnant_mother_id] = (countsByMother[c.pregnant_mother_id] || 0) + 1;
  });

  const tableRecords = (records ?? []).map((r) => ({
    ...r,
    checkupCount: countsByMother[r.id] ?? 0,
  }));

  return (
    <div>
      <div className="page-header">
        <h1>Prenatal Checkups</h1>
        <p className="page-date">
          Select a pregnant mother to view or record her 1st–3rd trimester checkups.
        </p>
      </div>

      <CheckupsTable records={tableRecords} />
    </div>
  );
}
