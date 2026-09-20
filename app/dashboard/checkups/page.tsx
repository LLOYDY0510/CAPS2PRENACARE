import CheckupsTable from '@/components/pregnant/CheckupsTable';
import { requireRoles } from '@/utils/auth/roles';
import { getPrenatalVisitStatus, type PrenatalVisitStatus } from '@/utils/prenatalStatus';

export const dynamic = 'force-dynamic';

export default async function PrenatalCheckupsPage() {
  const { supabase, profile, role } = await requireRoles(['admin', 'nurse', 'bhw_head', 'bhw_purok']);

  let recordsQuery = supabase
    .from('pregnant_mothers')
    .select('id, serial_no, first_name, middle_name, last_name, purok, edd')
    .order('serial_no', { ascending: true });
  if (role === 'bhw_purok' && profile?.purok) recordsQuery = recordsQuery.eq('purok', profile.purok);
  const { data: records } = await recordsQuery;

  const checkupQuery = supabase
    .from('prenatal_checkups')
    .select('pregnant_mother_id, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, scheduled_for, status');
  const { data: checkups } = await checkupQuery;
  const { data: scheduleRows } = await supabase
    .from('prenatal_schedules')
    .select('trimester, visit_date, created_at, prenatal_schedule_recipients!inner(pregnant_mother_id)')
    .not('trimester', 'is', null)
    .order('created_at', { ascending: false });

  const countsByMother: Record<string, number> = {};
  const statusByMother: Record<string, Record<'1st' | '2nd' | '3rd', PrenatalVisitStatus | null>> = {};
  const scheduledByMother: Record<string, Record<'1st' | '2nd' | '3rd', string | null>> = {};
  (scheduleRows ?? []).forEach((schedule) => {
    const trimester = schedule.trimester as '1st' | '2nd' | '3rd';
    if (!['1st', '2nd', '3rd'].includes(trimester)) return;
    const recipients = Array.isArray(schedule.prenatal_schedule_recipients) ? schedule.prenatal_schedule_recipients : [];
    recipients.forEach((recipient) => {
      const motherId = recipient.pregnant_mother_id;
      if (!scheduledByMother[motherId]) scheduledByMother[motherId] = { '1st': null, '2nd': null, '3rd': null };
      if (!scheduledByMother[motherId][trimester]) scheduledByMother[motherId][trimester] = schedule.visit_date;
    });
  });
  checkups?.forEach((checkup) => {
    const trimester = checkup.trimester as '1st' | '2nd' | '3rd';
    const scheduledDate = scheduledByMother[checkup.pregnant_mother_id]?.[trimester] ?? checkup.scheduled_checkup_date ?? checkup.scheduled_for ?? checkup.checkup_date;
    const status = getPrenatalVisitStatus({
      scheduledFor: scheduledDate,
      actualCheckupDate: checkup.actual_checkup_date,
      recordedStatus: checkup.status,
    });
    if (status === 'completed') {
      countsByMother[checkup.pregnant_mother_id] = (countsByMother[checkup.pregnant_mother_id] || 0) + 1;
    }
    if (trimester === '1st' || trimester === '2nd' || trimester === '3rd') {
      if (!statusByMother[checkup.pregnant_mother_id]) {
        statusByMother[checkup.pregnant_mother_id] = { '1st': null, '2nd': null, '3rd': null };
      }
      statusByMother[checkup.pregnant_mother_id][trimester] = status;
    }
  });

  const tableRecords = (records ?? []).map((r) => ({
    ...r,
    checkupCount: countsByMother[r.id] ?? 0,
    trimesterStatuses: statusByMother[r.id] ?? { '1st': null, '2nd': null, '3rd': null },
  }));

  return (
    <div>
      <div className="page-header">
        <h1>Prenatal Checkups</h1>
        <p className="page-date">
          Select a pregnant mother to view or record her 1st–3rd trimester checkups.
        </p>
      </div>

      <CheckupsTable records={tableRecords} />
    </div>
  );
}
