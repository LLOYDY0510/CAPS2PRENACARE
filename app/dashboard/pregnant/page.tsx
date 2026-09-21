import Link from 'next/link';
import PregnantRecordsTable from '@/components/pregnant/PregnantRecordsTable';
import { EDIT_ROLES, requireRoles } from '@/utils/auth/roles';
import type { UserRole } from '@/types';
import { getPrenatalVisitStatus } from '@/utils/prenatalStatus';
import { canAccessPurok } from '@/utils/auth/permissions';

export default async function PregnantRecordsPage() {
  const { supabase, profile, role } = await requireRoles(['admin', 'nurse', 'bhw_head', 'bhw_purok']);
  const canEdit = EDIT_ROLES.includes(role as UserRole);

  const recordsSelect =
    'id, serial_no, date_registered, first_name, middle_name, last_name, address, purok, age, date_of_birth, lmp, gravida_para, edd, blood_pressure, height_cm, weight_kg, risk_level, checkup_recorded';
  const legacyRecordsSelect =
    'id, serial_no, date_registered, first_name, middle_name, last_name, address, purok, age, lmp, gravida_para, edd, blood_pressure, height_cm, weight_kg, risk_level';

  let recordsQuery = supabase
    .from('pregnant_mothers')
    .select(recordsSelect)
    .order('serial_no', { ascending: true });
  if (role === 'bhw_purok' && profile?.purok) recordsQuery = recordsQuery.eq('purok', profile.purok);
  let { data: records, error } = await recordsQuery;

  if (error?.message.includes('checkup_recorded') || error?.message.includes('date_of_birth')) {
    let legacyQuery = supabase
      .from('pregnant_mothers')
      .select(legacyRecordsSelect)
      .order('serial_no', { ascending: true });
    if (role === 'bhw_purok' && profile?.purok) legacyQuery = legacyQuery.eq('purok', profile.purok);
    const legacyResult = await legacyQuery;
    records = legacyResult.data?.map((record) => ({ ...record, date_of_birth: null, checkup_recorded: false })) ?? null;
    error = legacyResult.error;
  }

  const { data: checkupRows } = await supabase
    .from('prenatal_checkups')
    .select('pregnant_mother_id, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, scheduled_for, status');
  const completedTrimesters: Record<string, Set<string>> = {};
  (checkupRows ?? []).forEach((checkup) => {
    const trimester = checkup.trimester;
    if (!['1st', '2nd', '3rd'].includes(trimester)) return;
    const status = getPrenatalVisitStatus({
      scheduledFor: checkup.scheduled_checkup_date ?? checkup.scheduled_for ?? checkup.checkup_date,
      actualCheckupDate: checkup.actual_checkup_date,
      recordedStatus: checkup.status,
    });
    if (status === 'completed') {
      if (!completedTrimesters[checkup.pregnant_mother_id]) completedTrimesters[checkup.pregnant_mother_id] = new Set();
      completedTrimesters[checkup.pregnant_mother_id].add(trimester);
    }
  });
  const recordsWithCheckupCount = (records ?? []).map((record) => ({
    ...record,
    checkupCount: completedTrimesters[record.id]?.size ?? 0,
    canEditRecord: canEdit && canAccessPurok(role, profile?.purok ?? null, record.purok),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Pregnant Records</h1>
          <p className="page-date">
            {records?.length ?? 0} registered pregnant mother
            {records?.length === 1 ? '' : 's'}
          </p>
        </div>
        {canEdit && (
          <Link href="/dashboard/pregnant/new" className="btn-primary">
            + Register Pregnant Mother
          </Link>
        )}
      </div>

      {error && (
        <div className="alert-error mb-4">
          Failed to load records: {error.message}
        </div>
      )}

      <PregnantRecordsTable
        records={recordsWithCheckupCount}
        canEdit={canEdit}
      />
    </div>
  );
}
