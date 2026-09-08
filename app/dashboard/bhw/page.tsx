import { createClient } from '@/utils/supabase/server';
import BhwTable from '@/components/users/BhwTable';

export const dynamic = 'force-dynamic';

export default async function ManageBhwPage() {
  const supabase = await createClient();

  // Get all users who are BHW (purok) or pending (candidates to promote)
  const { data: bhwUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, purok')
    .in('role', ['bhw_purok', 'pending'])
    .order('role', { ascending: true });

  // Get pregnant mother counts per purok, for workload display
  const { data: pregnantRecords } = await supabase
    .from('pregnant_mothers')
    .select('purok');

  const countsByPurok: Record<string, number> = {};
  pregnantRecords?.forEach((r) => {
    if (r.purok) {
      countsByPurok[r.purok] = (countsByPurok[r.purok] || 0) + 1;
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Manage BHW (Purok)</h1>
      <p className="text-muted mb-6">
        Assign puroks to BHW members and promote pending accounts.
      </p>

      <BhwTable initialUsers={bhwUsers ?? []} countsByPurok={countsByPurok} />
    </div>
  );
}