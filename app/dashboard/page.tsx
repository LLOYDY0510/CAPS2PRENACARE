import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import BhwHeadDashboard from '@/components/dashboard/BhwHeadDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import NurseDashboard from '@/components/dashboard/NurseDashboard';
import PregnantMotherDashboard from '@/components/dashboard/PregnantMotherDashboard';
export const dynamic = 'force-dynamic';
 
export default async function DashboardPage() {
  const supabase = await createClient();
 
  const {
    data: { user },
  } = await supabase.auth.getUser();
 
  if (!user) {
    redirect('/login');
  }
 
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, purok, pregnant_mother_id')
    .eq('id', user.id)
    .single();
 
  const role = profile?.role ?? 'pending';
 
  return (
        <div className="max-w-6xl mx-auto">
 
      {role === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2 text-ink">Waiting for role assignment</h1>
          <p className="text-muted">
            Your account hasn&apos;t been assigned a role yet. Please contact the admin.
          </p>
        </div>
      )}
 
      {role === 'bhw_head' && <BhwHeadDashboard />}
      {role === 'admin' && <AdminDashboard />}
      {role === 'nurse' && <NurseDashboard />}
 
      {role === 'bhw_purok' && (
        <div className="card p-6">
          <h1 className="text-2xl font-semibold mb-2 text-ink">
            BHW Dashboard — Purok {profile?.purok ?? '?'} 📍
          </h1>
          <p className="text-muted">Households and pregnant mothers in your assigned purok.</p>
        </div>
      )}
 
      {role === 'pregnant_mother' && profile?.pregnant_mother_id && (
        <PregnantMotherDashboard pregnantMotherId={profile.pregnant_mother_id} />
      )}
 
      {role === 'pregnant_mother' && !profile?.pregnant_mother_id && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2 text-ink">Account not linked</h1>
          <p className="text-muted">
            Your account isn&apos;t linked to a record yet. Please contact your BHW or admin.
          </p>
        </div>
      )}
    </div>
  );
}
 