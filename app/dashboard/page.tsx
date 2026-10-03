import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import BhwHeadDashboard from '@/components/dashboard/BhwHeadDashboard';
import BhwPurokDashboard from '@/components/dashboard/BhwPurokDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import NurseDashboard from '@/components/dashboard/NurseDashboard';
import PatientMessages from '@/components/patient/PatientMessages';
import { isUserRole } from '@/utils/auth/roles';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, purok, pregnant_mother_id')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? 'pending';

  return (
    <div className="dashboard-page w-full">
      {role === 'bhw_head' && <BhwHeadDashboard />}
      {role === 'bhw_purok' && <BhwPurokDashboard />}
      {role === 'admin' && <AdminDashboard />}
      {role === 'nurse' && <NurseDashboard />}

      {role === 'pregnant_mother' && profile?.pregnant_mother_id && (
        <PatientMessages pregnantMotherId={profile.pregnant_mother_id} />
      )}

      {role === 'pending' && (
        <div className="card p-6">
          <h1 className="text-lg mb-2">Waiting for role assignment</h1>
          <p className="text-muted">
            Your account has not been assigned a role yet. Please contact the administrator to
            request access.
          </p>
        </div>
      )}

      {role === 'pregnant_mother' && !profile?.pregnant_mother_id && (
        <div className="card p-6">
          <h1 className="text-lg mb-2">Account not linked</h1>
          <p className="text-muted">
            Your account is not linked to a prenatal record yet. Please contact your BHW or the
            administrator.
          </p>
        </div>
      )}

      {profileError && (
        <div className="alert-error" role="alert">
          Failed to load your account: {profileError.message}
        </div>
      )}

      {!profile && !profileError && (
        <div className="alert-error" role="alert">
          No profile record was found for your account. Please contact the administrator.
        </div>
      )}

      {profile && !isUserRole(role) && (
        <div className="alert-error" role="alert">
          Your account role ({String(profile.role)}) is not recognised. Please contact the
          administrator.
        </div>
      )}
    </div>
  );
}
