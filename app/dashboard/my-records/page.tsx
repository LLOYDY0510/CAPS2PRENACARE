import InfoRow from '@/components/ui/InfoRow';
import { AccountNotLinked, RecordNotFound } from '@/components/ui/PatientNotices';
import { getPrenatalVisitStatus, prenatalStatusLabel } from '@/utils/prenatalStatus';
import { getPatientContext } from '@/utils/patient';

export const dynamic = 'force-dynamic';

export default async function MyRecordsPage() {
  const { supabase, pregnantMotherId } = await getPatientContext();

  if (!pregnantMotherId) return <AccountNotLinked />;

  const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('serial_no, first_name, middle_name, last_name, blood_pressure, height_cm, weight_kg, risk_level')
    .eq('id', pregnantMotherId)
    .single();

  const { data: checkups } = await supabase
    .from('prenatal_checkups')
    .select('id, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, blood_pressure, weight_kg, notes, status, scheduled_for')
    .eq('pregnant_mother_id', pregnantMotherId)
    .order('checkup_date', { ascending: false });

  if (!record) return <RecordNotFound />;

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
            <span className="risk-pill risk-pill-high">High Risk</span>
          ) : (
            <span className="risk-pill risk-pill-low">Low Risk</span>
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
                  {c.scheduled_checkup_date ?? c.scheduled_for ?? c.checkup_date} — {c.trimester} Trimester
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Status: {prenatalStatusLabel(getPrenatalVisitStatus({ scheduledFor: c.scheduled_checkup_date ?? c.scheduled_for ?? c.checkup_date, actualCheckupDate: c.actual_checkup_date, recordedStatus: c.status }))}
                  {' · '}
                  Actual: {c.actual_checkup_date ?? '—'}
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
