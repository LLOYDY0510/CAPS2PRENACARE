import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getPrenatalVisitStatus, prenatalStatusLabel } from '@/utils/prenatalStatus';

export const dynamic = 'force-dynamic';

export default async function MyRecordsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('pregnant_mother_id')
    .eq('id', user.id)
    .single();

  const pregnantMotherId = profile?.pregnant_mother_id;

  if (!pregnantMotherId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-2 text-ink">Account not linked</h1>
        <p className="text-muted">
          Your account isn&apos;t linked to a record yet. Please contact your BHW or admin.
        </p>
      </div>
    );
  }

  const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('serial_no, first_name, middle_name, last_name, blood_pressure, height_cm, weight_kg, risk_level')
    .eq('id', pregnantMotherId)
    .single();

  const { data: checkups } = await supabase
    .from('prenatal_checkups')
    .select('id, trimester, checkup_date, blood_pressure, weight_kg, notes, status, scheduled_for')
    .eq('pregnant_mother_id', pregnantMotherId)
    .order('checkup_date', { ascending: false });

  if (!record) {
    return (
      <div className="card p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-2 text-ink">Record not found</h1>
        <p className="text-muted text-sm">
          We couldn&apos;t find your linked record. Please contact your BHW or midwife for help.
        </p>
      </div>
    );
  }

  const fullName = [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="card p-5">
        <h1 className="text-xl font-semibold text-ink">{fullName}</h1>
        <p className="text-sm text-muted mt-0.5">{record.serial_no}</p>
        <div className="mt-3">
          {record.risk_level === 'high' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
              High Risk
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Low Risk
            </span>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Medical Records</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
          <InfoRow label="Blood Pressure" value={record.blood_pressure} />
          <InfoRow label="Height" value={record.height_cm ? `${record.height_cm} cm` : null} />
          <InfoRow label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : null} />
        </div>

        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Checkup History
        </h3>
        {!checkups || checkups.length === 0 ? (
          <p className="text-sm text-muted-2">No checkups recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {checkups.map((c) => (
              <div key={c.id} className="border rounded-lg px-3 py-2">
                <p className="text-sm font-medium">
                  {c.checkup_date} — {c.trimester} Trimester
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Status: {prenatalStatusLabel(getPrenatalVisitStatus({ scheduledFor: c.scheduled_for ?? c.checkup_date, recordedStatus: c.status }))}
                  {' · '}
                  {c.blood_pressure ? `BP: ${c.blood_pressure}` : ''}
                  {c.weight_kg ? ` · Weight: ${c.weight_kg}kg` : ''}
                </p>
                {c.notes && <p className="text-xs text-muted mt-1">{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
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