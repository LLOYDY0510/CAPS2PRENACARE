import { AccountNotLinked } from '@/components/ui/PatientNotices';
import { getPatientContext } from '@/utils/patient';

export const dynamic = 'force-dynamic';

export default async function MySchedulePage() {
  const { supabase, pregnantMotherId } = await getPatientContext();

  if (!pregnantMotherId) return <AccountNotLinked />;

  const today = new Date().toISOString().slice(0, 10);
  const [scheduleResult, remindersResult] = await Promise.all([
    supabase
      .from('prenatal_schedules')
      .select('id, visit_date, trimester, prenatal_schedule_recipients!inner(pregnant_mother_id)')
      .eq('prenatal_schedule_recipients.pregnant_mother_id', pregnantMotherId)
      .gte('visit_date', today)
      .order('visit_date', { ascending: true })
      .limit(5),
    supabase
      .from('prenatal_schedule_reminders')
      .select('id, message, sent_at')
      .eq('pregnant_mother_id', pregnantMotherId)
      .order('sent_at', { ascending: false })
      .limit(20),
  ]);

  const { data: upcomingSchedules, error: scheduleError } = scheduleResult;
  const { data: reminders, error: remindersError } = remindersResult;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {(scheduleError || remindersError) && (
        <div className="alert-error" role="alert">
          Failed to load your schedule: {(scheduleError ?? remindersError)?.message}
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <h2>Prenatal Schedule</h2>
        </div>
        <div className="p-5">
          {upcomingSchedules && upcomingSchedules.length > 0 ? (
            <ul className="space-y-2">
              {upcomingSchedules.map((schedule) => (
                <li key={schedule.id} className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-ink">{schedule.visit_date}</span>
                  {schedule.trimester && (
                    <span className="badge-neutral">{schedule.trimester} trimester</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-2">No prenatal schedule has been set yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Reminders ({reminders?.length ?? 0})</h2>
        </div>
        <div className="p-5">
          {!reminders || reminders.length === 0 ? (
            <p className="text-sm text-muted-2">No reminders yet.</p>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="border rounded-lg p-3">
                  <p className="text-sm text-ink-secondary">{r.message}</p>
                  <p className="text-xs text-muted-2 mt-1">
                    {r.sent_at ? new Date(r.sent_at).toLocaleString() : 'Not sent yet'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
