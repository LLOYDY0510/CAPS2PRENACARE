import SectionHeading from '@/components/ui/SectionHeading';
import { ShieldCheck, ClipboardList } from 'lucide-react';
import InfoRow from '@/components/ui/InfoRow';
import { AccountNotLinked, RecordNotFound } from '@/components/ui/PatientNotices';
import RiskBadge from '@/components/ui/RiskBadge';
import { visitStatusFor,visitLabel } from '@/utils/prenatalProjection';
import { prenatalStatusLabel } from '@/utils/prenatalStatus';
import { getPatientContext } from '@/utils/patient';
import PageHeader from '@/components/ui/PageHeader';
import { FileText } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function MyRecordsPage() {
  const { supabase, pregnantMotherId } = await getPatientContext();

  if (!pregnantMotherId) return <AccountNotLinked />;

  const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('serial_no, first_name, middle_name, last_name, blood_pressure, waist_cm, height_cm, weight_kg, risk_level')
    .eq('id', pregnantMotherId)
    .single();

  const { data: checkups } = await supabase
    .from('prenatal_checkups')
    .select('id, schedule_id, visit_number, trimester, checkup_date, scheduled_checkup_date, actual_checkup_date, blood_pressure, weight_kg, notes, status, scheduled_for')
    .eq('pregnant_mother_id', pregnantMotherId)
    .order('checkup_date', { ascending: false });

  if (!record) return <RecordNotFound />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="My Records"
        icon={FileText}
        subtitle={record.serial_no}
      />

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeading title="Risk Assessment" icon={ShieldCheck}/>
          <RiskBadge riskLevel={record.risk_level} />
        </div>
      </div>

      <div className="card p-6">
        <SectionHeading title="Medical Records" icon={ClipboardList}/>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          <InfoRow label="Blood Pressure" value={record.blood_pressure} />
          <InfoRow label="Waist Line" value={record.waist_cm != null ? `${record.waist_cm} cm` : null} />
          <InfoRow label="Height" value={record.height_cm ? `${record.height_cm} cm` : null} />
          <InfoRow label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : null} />
        </div>

        <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wide mb-3">
          Checkup History
        </h3>
        {!checkups || checkups.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No checkups recorded yet"
            description="Your prenatal checkup history will appear here."
          />
        ) : (
          <div className="space-y-3">
            {checkups.map((c) => (
              <div key={c.id} className="border border-neutral-200/60 rounded-2xl px-4 py-3 hover:bg-neutral-50/50 transition-colors">
                <p className="text-sm font-semibold text-neutral-800">
                  {c.scheduled_checkup_date ?? c.scheduled_for ?? c.checkup_date} — {c.trimester} Trimester · {visitLabel(c.visit_number)}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Status: {prenatalStatusLabel(visitStatusFor(c))}
                  {' · '}
                  Actual: {c.actual_checkup_date ?? '—'}
                  {' · '}
                  {c.blood_pressure ? `BP: ${c.blood_pressure}` : ''}
                  {c.weight_kg ? ` · Weight: ${c.weight_kg}kg` : ''}
                </p>
                {c.notes && <p className="text-xs text-neutral-500 mt-2">{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
