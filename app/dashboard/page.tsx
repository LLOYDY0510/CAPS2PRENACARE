import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

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
    <div className="max-w-4xl">
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

      {role === 'bhw_head' && <BhwHeadDashboard />}

      {role === 'nurse' && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Nurse Dashboard 💉</h1>
          <p className="text-gray-600">Patient records, immunizations, and health monitoring.</p>
        </div>
      )}

      {role === 'midwife' && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Midwife Dashboard 🩺</h1>
          <p className="text-gray-600">Overview of pregnant mothers, checkups, and schedules.</p>
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
  );
}

async function BhwHeadDashboard() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, purok, risk_level');

  const total = records?.length ?? 0;
  const highRisk = records?.filter((r) => r.risk_level === 'high').length ?? 0;
  const mediumRisk = records?.filter((r) => r.risk_level === 'medium').length ?? 0;
  const lowRisk = records?.filter((r) => r.risk_level === 'low').length ?? 0;

  // Group by purok
  const byPurok: Record<string, number> = {};
  records?.forEach((r) => {
    const p = r.purok || 'Unassigned';
    byPurok[p] = (byPurok[p] || 0) + 1;
  });

  const { count: bhwCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'bhw_purok');

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">BHW Head Dashboard 📋</h1>
      <p className="text-gray-600 mb-6">Overview of all puroks, BHW activities, and reports.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Registered" value={total} color="text-gray-900" />
        <StatCard label="High Risk" value={highRisk} color="text-red-600" />
        <StatCard label="Medium Risk" value={mediumRisk} color="text-amber-600" />
        <StatCard label="Low Risk" value={lowRisk} color="text-green-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Per-purok breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="font-semibold mb-3">Records per Purok</h2>
          {Object.keys(byPurok).length === 0 ? (
            <p className="text-sm text-gray-400">No records yet.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(byPurok).map(([purok, count]) => (
                <li key={purok} className="flex justify-between text-sm">
                  <span className="text-gray-600">Purok {purok}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* BHW count */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="font-semibold mb-3">BHW Members</h2>
          <p className="text-3xl font-semibold">{bhwCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Active BHW assigned to puroks</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}