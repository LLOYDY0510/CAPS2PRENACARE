import ReportsTable from '@/components/reports/ReportsTable';
import { type ReportRow } from '@/components/reports/ReportExport';
import { requireRoles } from '@/utils/auth/roles';
import { getPrenatalVisitStatus, type PrenatalVisitStatus } from '@/utils/prenatalStatus';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { supabase, profile, role } = await requireRoles(['admin', 'nurse', 'bhw_head', 'bhw_purok']);

  // Main records
  let recordsQuery = supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, date_registered, first_name, middle_name, last_name, address, purok, age, contact_number, lmp, edd, gravida_para, blood_pressure, height_cm, weight_kg, risk_level'
    )
    .order('serial_no', { ascending: true });
  if (role === 'bhw_purok' && profile?.purok) recordsQuery = recordsQuery.eq('purok', profile.purok);
  const { data: records, error } = await recordsQuery;

  // Checkup counts per mother
  const { data: checkupRows } = await supabase
    .from('prenatal_checkups')
    .select('pregnant_mother_id, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, scheduled_for, status');

  const checkupCounts: Record<string, number> = {};
  const missedCounts: Record<string, number> = {};
  const upcomingCounts: Record<string, number> = {};

  // Next prenatal schedule per mother
  const today = new Date().toISOString().slice(0, 10);
  const { data: scheduleRows } = await supabase
    .from('prenatal_schedules')
    .select('trimester, visit_date, created_at, prenatal_schedule_recipients!inner(pregnant_mother_id)')
    .not('trimester', 'is', null)
    .order('created_at', { ascending: false });

  // Keep only the earliest upcoming visit per mother
  const nextVisit: Record<string, string> = {};
  const scheduledByMother: Record<string, Record<'1st' | '2nd' | '3rd', string | null>> = {};
  scheduleRows?.forEach((s) => {
    const recipients = Array.isArray(s.prenatal_schedule_recipients) ? s.prenatal_schedule_recipients : [];
    recipients.forEach((recipient) => {
      const trimester = s.trimester as '1st' | '2nd' | '3rd';
      if (trimester === '1st' || trimester === '2nd' || trimester === '3rd') {
        if (!scheduledByMother[recipient.pregnant_mother_id]) scheduledByMother[recipient.pregnant_mother_id] = { '1st': null, '2nd': null, '3rd': null };
        if (!scheduledByMother[recipient.pregnant_mother_id][trimester]) scheduledByMother[recipient.pregnant_mother_id][trimester] = s.visit_date;
      }
      if (s.visit_date >= today && !nextVisit[recipient.pregnant_mother_id]) {
        nextVisit[recipient.pregnant_mother_id] = s.visit_date;
      }
    });
  });

  checkupRows?.forEach((c) => {
    const trimester = c.trimester as '1st' | '2nd' | '3rd';
    const scheduledDate = scheduledByMother[c.pregnant_mother_id]?.[trimester] ?? c.scheduled_checkup_date ?? c.scheduled_for ?? c.checkup_date;
    const status = getPrenatalVisitStatus({ scheduledFor: scheduledDate, actualCheckupDate: c.actual_checkup_date, recordedStatus: c.status });
    if (status === 'completed') checkupCounts[c.pregnant_mother_id] = (checkupCounts[c.pregnant_mother_id] || 0) + 1;
    if (status === 'missed') missedCounts[c.pregnant_mother_id] = (missedCounts[c.pregnant_mother_id] || 0) + 1;
    if (status === 'upcoming') upcomingCounts[c.pregnant_mother_id] = (upcomingCounts[c.pregnant_mother_id] || 0) + 1;
  });

  const rows: ReportRow[] = (records ?? []).map((r) => ({
    serial_no:       r.serial_no,
    date_registered: r.date_registered,
    name:            [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' '),
    address:         r.address,
    purok:           r.purok,
    age:             r.age,
    contact_number:  r.contact_number,
    lmp:             r.lmp,
    edd:             r.edd,
    gravida_para:    r.gravida_para,
    blood_pressure:  r.blood_pressure,
    height_cm:       r.height_cm,
    weight_kg:       r.weight_kg,
    risk_level:      r.risk_level,
  }));

  // Extra metadata passed to the client table (not part of ReportRow export type)
  const meta: Record<string, { checkupCount: number; nextVisit: string | null; missedVisits: number; upcomingVisits: number; latestStatus: PrenatalVisitStatus | null }> = {};
  (records ?? []).forEach((r) => {
    const latestCheckup = (checkupRows ?? [])
      .filter((checkup) => checkup.pregnant_mother_id === r.id)
      .sort((a, b) => (b.scheduled_checkup_date ?? b.scheduled_for ?? b.checkup_date).localeCompare(a.scheduled_checkup_date ?? a.scheduled_for ?? a.checkup_date))[0];
    meta[r.id] = {
      checkupCount: checkupCounts[r.id] ?? 0,
      nextVisit:    nextVisit[r.id] ?? null,
      missedVisits: missedCounts[r.id] ?? 0,
      upcomingVisits: upcomingCounts[r.id] ?? 0,
      latestStatus: latestCheckup ? getPrenatalVisitStatus({ scheduledFor: scheduledByMother[r.id]?.[latestCheckup.trimester as '1st' | '2nd' | '3rd'] ?? latestCheckup.scheduled_checkup_date ?? latestCheckup.scheduled_for ?? latestCheckup.checkup_date, actualCheckupDate: latestCheckup.actual_checkup_date, recordedStatus: latestCheckup.status }) : null,
    };
  });

  // Attach id to rows for meta lookup — passed separately so ReportRow stays unchanged
  const rowsWithId = (records ?? []).map((r, i) => ({
    ...rows[i],
    _id: r.id,
  }));

  return (
    <div>
      {error && (
        <div className="alert-error mb-4">
          Failed to load records: {error.message}
        </div>
      )}

      <ReportsTable rowsWithId={rowsWithId} meta={meta} />
    </div>
  );
}
