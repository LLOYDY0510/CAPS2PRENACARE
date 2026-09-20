import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PrenatalCheckups from '@/components/pregnant/PrenatalCheckups';
import MaternalCarePanel from '@/components/pregnant/MaternalCarePanel';
import { EDIT_ROLES } from '@/utils/auth/roles';
import type { UserRole } from '@/types';

export const dynamic = 'force-dynamic';
 
export default async function ViewPregnantMotherPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const showCheckups = view === 'checkups';
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

  const fullName = [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(' ');
 
  const { data: checkups } = showCheckups
    ? await supabase
        .from('prenatal_checkups')
        .select('id, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, blood_pressure, weight_kg, notes, status, scheduled_for')
        .eq('pregnant_mother_id', id)
    : { data: [] };

  const { data: scheduleRows } = showCheckups
    ? await supabase
        .from('prenatal_schedules')
        .select('trimester, visit_date, created_at, prenatal_schedule_recipients!inner(pregnant_mother_id)')
        .eq('prenatal_schedule_recipients.pregnant_mother_id', id)
        .not('trimester', 'is', null)
        .order('created_at', { ascending: false })
    : { data: [] };
  const scheduledDates: Record<'1st' | '2nd' | '3rd', string | null> = { '1st': null, '2nd': null, '3rd': null };
  (scheduleRows ?? []).forEach((schedule) => {
    const trimester = schedule.trimester as '1st' | '2nd' | '3rd';
    if ((trimester === '1st' || trimester === '2nd' || trimester === '3rd') && !scheduledDates[trimester]) {
      scheduledDates[trimester] = schedule.visit_date;
    }
  });

  const [{ data: history }, { data: referrals }] = showCheckups
    ? [{ data: [] }, { data: [] }]
    : await Promise.all([
        supabase.from('maternal_health_history').select('id, condition, details, diagnosed_date, resolved_date, created_at').eq('pregnant_mother_id', id).order('created_at', { ascending: false }),
        supabase.from('maternal_referrals').select('id, referred_to, reason, status, referred_at, follow_up_date, outcome, updated_at').eq('pregnant_mother_id', id).order('updated_at', { ascending: false }),
      ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showCheckups ? (
        <PrenatalCheckups motherId={id} initialCheckups={checkups ?? []} scheduledDates={scheduledDates} canEdit={canEdit} />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-semibold mb-1">{record.serial_no ?? 'Record'} - {fullName}</h1>
            <p className="text-muted">Pregnant mother details.</p>
          </div>
          <div className="card p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label="Date Registered" value={record.date_registered} />
              <InfoRow label="Address" value={record.address} />
              <InfoRow label="Zone" value={record.purok ? `Zone ${record.purok}` : null} />
              <InfoRow label="Age" value={record.age} />
              <InfoRow label="Contact Number" value={record.contact_number} />
              <InfoRow label="LMP" value={record.lmp} />
              <InfoRow label="EDC" value={record.edd} />
              <InfoRow label="Gravida-Para" value={record.gravida_para} />
              <InfoRow label="Blood Pressure" value={record.blood_pressure} />
              <InfoRow label="Height" value={record.height_cm ? `${record.height_cm} cm` : null} />
              <InfoRow label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : null} />
              <InfoRow label="Risk Level" value={record.risk_level === 'high' ? 'High Risk' : 'Low Risk'} />
            </div>
          </div>
          <MaternalCarePanel motherId={id} canEdit={canEdit} initialHistory={history ?? []} initialReferrals={referrals ?? []} />
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-muted-2 text-xs mb-0.5">{label}</p>
      <p className="text-gray-800">{value ?? '—'}</p>
    </div>
  );
}