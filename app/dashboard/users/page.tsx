import UsersTable from '@/components/users/UsersTable';
import { requireUserManagement } from '@/utils/auth/middleware';
import { createAdminClient } from '@/utils/supabase/admin';
import PageHeader from '@/components/ui/PageHeader';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ManageUsersPage() {
  // Authorised as admin above; profile administration needs the service role
  // because public.profiles RLS limits signed-in users to their own row.
  await requireUserManagement();
  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, purok, pregnant_mother_id, created_at')
    .order('created_at', { ascending: false });

  const { data: allMothers, error: mothersError } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, serial_no')
    .order('serial_no', { ascending: true });

  if (error || mothersError) {
    return (
      <div>
        <PageHeader
          title="Manage Users"
          icon={Users}
          subtitle={`${profiles?.length ?? 0} account${profiles?.length === 1 ? '' : 's'}`}
        />
        <div className="alert-error">
          Failed to load accounts: {error?.message ?? mothersError?.message}
        </div>
      </div>
    );
  }

  const linkedIds = (profiles ?? [])
    .map((p) => p.pregnant_mother_id)
    .filter((id): id is string => !!id);

  const availableMothers = (allMothers ?? []).filter((m) => !linkedIds.includes(m.id));

  return (
    <div>
      <PageHeader
        title="Manage Users"
        icon={Users}
        subtitle={`${profiles?.length ?? 0} account${profiles?.length === 1 ? '' : 's'}`}
      />

      <UsersTable
        profiles={profiles ?? []}
        availableMothers={availableMothers}
        allMothers={allMothers ?? []}
      />
    </div>
  );
}
