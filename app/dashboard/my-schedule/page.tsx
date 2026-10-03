import { AccountNotLinked } from '@/components/ui/PatientNotices';
import { getPatientContext } from '@/utils/patient';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Calendar, Bell } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="My Schedule"
        icon={Calendar}
      />

      {(scheduleError || remindersError) && (
        <div className="alert-error" role="alert">
          Failed to load your schedule: {(scheduleError ?? remindersError)?.message}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/60 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Prenatal Schedule</h2>
        </div>
        <div className="p-6">
          {upcomingSchedules && upcomingSchedules.length > 0 ? (
            <ul className="space-y-3">
              {upcomingSchedules.map((schedule) => (
                <li key={schedule.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl">
                  <span className="text-base font-semibold text-slate-800">{schedule.visit_date}</span>
                  {schedule.trimester && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {schedule.trimester} trimester
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No prenatal schedule set"
              description="Your upcoming prenatal visits will appear here."
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/60 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Reminders ({reminders?.length ?? 0})</h2>
        </div>
        <div className="p-6">
          {!reminders || reminders.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No reminders yet"
              description="Your appointment reminders will appear here."
            />
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="border border-slate-200/60 rounded-2xl p-4 hover:bg-slate-50/50 transition-colors">
                  <p className="text-sm text-slate-800">{r.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
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
