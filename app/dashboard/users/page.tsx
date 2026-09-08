import { createClient } from '@/utils/supabase/server';
import UsersTable from '@/components/users/UsersTable';

export const dynamic = 'force-dynamic';

export default async function ManageUsersPage() {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, purok, pregnant_mother_id, created_at')
    .order('created_at', { ascending: false });

  const linkedIds = (profiles ?? [])
    .map((p) => p.pregnant_mother_id)
    .filter((id): id is string => !!id);

  const { data: allMothers } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, serial_no')
    .order('serial_no', { ascending: true });

  const availableMothers = (allMothers ?? []).filter((m) => !linkedIds.includes(m.id));

  return (
    <div>
      <div className="page-header">
        <h1>Manage Users</h1>
        <p className="page-date">
          {profiles?.length ?? 0} account{profiles?.length === 1 ? '' : 's'}
        </p>
      </div>

      {error && (
        <div className="alert-error mb-4">
          Failed to load users: {error.message}
        </div>
      )}

      <UsersTable
        profiles={profiles ?? []}
        availableMothers={availableMothers}
        allMothers={allMothers ?? []}
      />
    </div>
  );
}
