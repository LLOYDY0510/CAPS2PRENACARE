import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MySchedulePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('pregnant_mother_id')
    .eq('id', user.id)
    .single();

  const pregnantMotherId = profile?.pregnant_mother_id;

  if (!pregnantMotherId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-2 text-ink">Account not linked</h1>
        <p className="text-muted">
          Your account isn&apos;t linked to a record yet. Please contact your BHW or admin.
        </p>
      </div>
    );
  }

  const { data: upcomingSchedule } = await supabase
    .from('prenatal_schedules')
    .select('visit_date')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: reminders } = await supabase
    .from('prenatal_schedule_reminders')
    .select('id, message, sent_at')
    .eq('pregnant_mother_id', pregnantMotherId)
    .order('sent_at', { ascending: false });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Prenatal Schedule</h2>
        {upcomingSchedule ? (
          <p className="text-lg font-semibold text-ink">{upcomingSchedule.visit_date}</p>
        ) : (
          <p className="text-sm text-muted-2">No prenatal schedule has been set yet.</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Reminders ({reminders?.length ?? 0})
        </h2>
        {!reminders || reminders.length === 0 ? (
          <p className="text-sm text-muted-2">No reminders yet.</p>
        ) : (
          <div className="space-y-3">
            {reminders.map((r) => (
              <div key={r.id} className="border rounded-lg p-3">
                <p className="text-sm text-gray-700">{r.message}</p>
                <p className="text-xs text-muted-2 mt-1">
                  {new Date(r.sent_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}