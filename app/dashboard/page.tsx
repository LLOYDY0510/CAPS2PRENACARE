import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import BhwHeadDashboard from '@/components/BhwHeadDashboard';

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
    .select('role, full_name, purok')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'pending';

  return (
    <div className="max-w-5xl">
      <p className="text-sm text-muted mb-6">
        Logged in as {user.email} · Role: <span className="font-medium text-ink capitalize">{role.replace('_', ' ')}</span>
      </p>

      {role === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2 text-ink">Waiting for role assignment</h1>
          <p className="text-muted">
            Your account hasn&apos;t been assigned a role yet. Please contact the admin.
          </p>
        </div>
      )}

      {role === 'bhw_head' && <BhwHeadDashboard />}

      {role === 'nurse' && (
        <div className="card p-6">
          <h1 className="text-2xl font-semibold mb-2 text-ink">Nurse Dashboard 💉</h1>
          <p className="text-muted">Patient records, immunizations, and health monitoring.</p>
        </div>
      )}

      {role === 'midwife' && (
        <div className="card p-6">
          <h1 className="text-2xl font-semibold mb-2 text-ink">Midwife Dashboard 🩺</h1>
          <p className="text-muted">Overview of pregnant mothers, checkups, and schedules.</p>
        </div>
      )}

      {role === 'bhw_purok' && (
        <div className="card p-6">
          <h1 className="text-2xl font-semibold mb-2 text-ink">
            BHW Dashboard — Purok {profile?.purok ?? '?'} 📍
          </h1>
          <p className="text-muted">Households and pregnant mothers in your assigned purok.</p>
        </div>
      )}

      {role === 'pregnant_mother' && (
        <div className="card p-6">
          <h1 className="text-2xl font-semibold mb-2 text-ink">My Health Dashboard 🤰</h1>
          <p className="text-muted">Your checkup schedule, records, and reminders.</p>
        </div>
      )}
    </div>
  );
}
