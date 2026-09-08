import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import PregnantRecordsTable from '@/components/pregnant/PregnantRecordsTable';

export default async function PregnantRecordsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const role    = profile?.role ?? 'pending';
  const canEdit = role !== 'admin' && role !== 'nurse';

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
