import { createClient } from '@/utils/supabase/server';
import ScheduleSetter from '@/components/ScheduleSetter';
 
export const dynamic = 'force-dynamic';
 
export default async function PrenatalSchedulePage() {
  const supabase = await createClient();
 
  const { data: currentSchedule } = await supabase
    .from('prenatal_schedules')
    .select('id, visit_date, reminder_sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
 
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Prenatal Schedule</h1>
      <p className="text-muted mb-6">
        Set the next barangay-wide prenatal checkup date. Reminders are sent automatically.
      </p>
 
      <ScheduleSetter currentSchedule={currentSchedule ?? null} />
    </div>
  );
}