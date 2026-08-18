import { redirect } from 'next/navigation';
import { createClient } from '../../utils/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no logged-in user, kick them back to login
  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile (which includes their role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, purok')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'pending';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-gray-500 mb-6">
          Logged in as {user.email} · Role: <span className="font-medium">{role}</span>
        </p>

        {role === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h1 className="text-xl font-semibold mb-2">Waiting for role assignment</h1>
            <p className="text-gray-600">
              Your account hasn&apos;t been assigned a role yet. Please contact the admin.
            </p>
          </div>
        )}

        {role === 'midwife' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-semibold mb-2">Midwife Dashboard 🩺</h1>
            <p className="text-gray-600">Overview of pregnant mothers, checkups, and schedules.</p>
          </div>
        )}

        {role === 'nurse' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-semibold mb-2">Nurse Dashboard 💉</h1>
            <p className="text-gray-600">Patient records, immunizations, and health monitoring.</p>
          </div>
        )}

        {role === 'bhw_head' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-semibold mb-2">BHW Dashboard 📋</h1>
            <p className="text-gray-600">Overview of all puroks, BHW activities, and reports.</p>
          </div>
        )}

        {role === 'bhw_purok' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-semibold mb-2">
              BHW Dashboard — Purok {profile?.purok ?? '?'} 📍
            </h1>
            <p className="text-gray-600">Households and pregnant mothers in your assigned purok.</p>
          </div>
        )}

        {role === 'pregnant_mother' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-semibold mb-2">My Health Dashboard 🤰</h1>
            <p className="text-gray-600">Your checkup schedule, records, and reminders.</p>
          </div>
        )}
      </div>
    </div>
  );
}