import ScheduleSetter from '@/components/schedule/ScheduleSetter';
import { requireRoles } from '@/utils/auth/roles';
import { canManageSchedules } from '@/utils/auth/permissions';
 
export const dynamic = 'force-dynamic';
 
export default async function PrenatalSchedulePage() {
  const { supabase, profile, role } = await requireRoles(['admin', 'bhw_head', 'bhw_purok']);
 
  const { data: currentSchedule } = await supabase
    .from('prenatal_schedules')
    .select('id, visit_date, reminder_sent, status, trimester')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
 
  let mothersQuery = supabase
    .from('pregnant_mothers')
    .select('id, full_name, purok, contact_number')
    .order('full_name', { ascending: true });
  if (role === 'bhw_purok' && profile?.purok) mothersQuery = mothersQuery.eq('purok', profile.purok);
  const { data: mothers } = await mothersQuery;
 
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
 