import { createClient } from '@/utils/supabase/server';
import UserRoleEditor from '@/components/UserRoleEditor';
 
export const dynamic = 'force-dynamic';
 
export default async function ManageUsersPage() {
  const supabase = await createClient();
 
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, purok, pregnant_mother_id, created_at')
    .order('created_at', { ascending: false });
 
  // Pregnant mother records not yet linked to any account
  const linkedIds = (profiles ?? [])
    .map((p) => p.pregnant_mother_id)
    .filter((id): id is string => !!id);
 
  let motherQuery = supabase
    .from('pregnant_mothers')
    .select('id, full_name, serial_no')
    .order('serial_no', { ascending: true });
 
  const { data: allMothers } = await motherQuery;
  const availableMothers = (allMothers ?? []).filter((m) => !linkedIds.includes(m.id));
 
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Manage Users</h1>
        <p className="text-muted">
          {profiles?.length ?? 0} account{profiles?.length === 1 ? '' : 's'}
        </p>
      </div>
 
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">
          Failed to load users: {error.message}
        </p>
      )}
 
      <div className="card overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b text-left text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Purok / Linked Record</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-2">
                  No user accounts found.
                </td>
              </tr>
            )}
            {profiles?.map((p) => (
              <UserRoleEditor
                key={p.id}
                profile={p}
                availableMothers={
                  p.pregnant_mother_id
                    ? [
                        ...availableMothers,
                        ...(allMothers?.filter((m) => m.id === p.pregnant_mother_id) ?? []),
                      ]
                    : availableMothers
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}