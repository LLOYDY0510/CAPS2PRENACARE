import BhwTable from '@/components/users/BhwTable';
import { requireBhwManagement } from '@/utils/auth/middleware';
import { createAdminClient } from '@/utils/supabase/admin';
import PageHeader from '@/components/ui/PageHeader';
import HighlightedBannerCard from '@/components/ui/HighlightedBannerCard';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ManageBhwPage() {
  await requireBhwManagement();
  // Read with the service role: profile administration spans every account,
  // which public.profiles RLS deliberately hides from a signed-in user.
  const adminSupabase = createAdminClient();

  const { data: bhwUsers, error: usersError } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, role, purok')
    .in('role', ['bhw_purok', 'pending'])
    .order('role', { ascending: true });

  const { data: pregnantRecords, error: mothersError } = await adminSupabase
    .from('pregnant_mothers')
    .select('purok');

  if (usersError || mothersError) {
    return (
      <div>
        <PageHeader
          title="Manage BHW (Purok)"
          subtitle={`${bhwUsers?.length ?? 0} account${(bhwUsers?.length ?? 0) === 1 ? '' : 's'}`}
        />
        <div className="alert-error" role="alert">
          Failed to load BHW accounts: {usersError?.message ?? mothersError?.message}
        </div>
      </div>
    );
  }

  const countsByPurok: Record<string, number> = {};
  pregnantRecords?.forEach((r) => {
    if (r.purok) {
      countsByPurok[r.purok] = (countsByPurok[r.purok] || 0) + 1;
    }
  });

  const unassigned = (bhwUsers ?? []).filter((u) => u.role === 'bhw_purok' && !u.purok).length;

  return (
    <div>
      <PageHeader
        title="Manage BHW (Purok)"
        subtitle={`${bhwUsers?.length ?? 0} account${(bhwUsers?.length ?? 0) === 1 ? '' : 's'} · ${unassigned} BHW without a purok`}
      />

      {unassigned > 0 && (
        <div className="mb-4">
          <HighlightedBannerCard
            icon={AlertTriangle}
            title={`${unassigned} BHW account${unassigned === 1 ? ' has' : 's have'} no purok assigned`}
            description="They cannot see any mother records until a purok is set."
            badgeText="Warning"
          />
        </div>
      )}

      <BhwTable initialUsers={bhwUsers ?? []} countsByPurok={countsByPurok} />
    </div>
  );
}
