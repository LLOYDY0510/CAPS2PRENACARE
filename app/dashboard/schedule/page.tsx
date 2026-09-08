import { createClient } from '@/utils/supabase/server';
import ScheduleSetter from '@/components/schedule/ScheduleSetter';
 
export const dynamic = 'force-dynamic';
 
export default async function PrenatalSchedulePage() {
  const supabase = await createClient();
 
  const { data: currentSchedule } = await supabase
    .from('prenatal_schedules')
    .select('id, visit_date, reminder_sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
 
  const { data: mothers } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, purok, contact_number')
    .order('full_name', { ascending: true });
 
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Prenatal Schedule</h1>
      <p className="text-muted mb-6">
        Set the next prenatal checkup date and choose who should receive the reminder.
      </p>
 
      <ScheduleSetter currentSchedule={currentSchedule ?? null} mothers={mothers ?? []} />
    </div>
  );
}
 