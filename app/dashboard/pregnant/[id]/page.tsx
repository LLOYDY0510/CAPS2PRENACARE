import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PrenatalCheckups from '@/components/pregnant/PrenatalCheckups';
import MaternalCarePanel from '@/components/pregnant/MaternalCarePanel';
import { EDIT_ROLES } from '@/utils/auth/roles';
import type { UserRole } from '@/types';

export const dynamic = 'force-dynamic';
 
export default async function ViewPregnantMotherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
 
  const {
    data: { user },
  } = await supabase.auth.getUser();
 
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();
 
  const role = profile?.role ?? 'pending';
  const canEdit = EDIT_ROLES.includes(role as UserRole);
 
   const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('*')
    .eq('id', id)
    .single();

  if (!record) {
    notFound();
  }
 
  const { data: checkups } = await supabase
    .from('prenatal_checkups')
    .select('id, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, blood_pressure, weight_kg, notes, status, scheduled_for')
    .eq('pregnant_mother_id', id);

  const { data: scheduleRows } = await supabase
    .from('prenatal_schedules')
    .select('trimester, visit_date, created_at, prenatal_schedule_recipients!inner(pregnant_mother_id)')
    .eq('prenatal_schedule_recipients.pregnant_mother_id', id)
    .not('trimester', 'is', null)
    .order('created_at', { ascending: false });
  const scheduledDates: Record<'1st' | '2nd' | '3rd', string | null> = { '1st': null, '2nd': null, '3rd': null };
  (scheduleRows ?? []).forEach((schedule) => {
    const trimester = schedule.trimester as '1st' | '2nd' | '3rd';
    if ((trimester === '1st' || trimester === '2nd' || trimester === '3rd') && !scheduledDates[trimester]) {
      scheduledDates[trimester] = schedule.visit_date;
    }
  });

  const [{ data: history }, { data: referrals }] = await Promise.all([
    supabase.from('maternal_health_history').select('id, condition, details, diagnosed_date, resolved_date, created_at').eq('pregnant_mother_id', id).order('created_at', { ascending: false }),
    supabase.from('maternal_referrals').select('id, referred_to, reason, status, referred_at, follow_up_date, outcome, updated_at').eq('pregnant_mother_id', id).order('updated_at', { ascending: false }),
  ]);
 
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PrenatalCheckups motherId={id} initialCheckups={checkups ?? []} scheduledDates={scheduledDates} canEdit={canEdit} />
      <MaternalCarePanel
        motherId={id}
        canEdit={canEdit}
        initialHistory={history ?? []}
        initialReferrals={referrals ?? []}
      />
    </div>
  );
}