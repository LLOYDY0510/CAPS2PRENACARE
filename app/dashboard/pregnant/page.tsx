import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import PregnantRecordsTable from '@/components/pregnant/PregnantRecordsTable';
import { EDIT_ROLES, requireRoles } from '@/utils/auth/roles';
import type { UserRole } from '@/types';

export default async function PregnantRecordsPage() {
  const { supabase, role } = await requireRoles(['admin', 'nurse', 'bhw_head', 'bhw_purok']);
  const canEdit = EDIT_ROLES.includes(role as UserRole);

  const { data: records, error } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, date_registered, first_name, middle_name, last_name, address, age, lmp, gravida_para, edd, blood_pressure, height_cm, weight_kg, risk_level'
    )
    .order('serial_no', { ascending: true });

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
        records={records ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
