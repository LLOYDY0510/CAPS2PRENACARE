import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PrenatalCheckups from '@/components/pregnant/PrenatalCheckups';
 
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
  const canEdit = role !== 'admin' && role !== 'nurse';
 
   const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('*')
    .eq('id', id)
    .single();

  const { data: matchedIndicators } = await supabase
    .from('pregnant_mother_indicators')
    .select('risk_indicators(label)')
    .eq('pregnant_mother_id', id);

  const riskReasons = (matchedIndicators ?? [])
    .map((m: any) =>
      Array.isArray(m.risk_indicators) ? m.risk_indicators[0]?.label : m.risk_indicators?.label
    )
    .filter((label): label is string => !!label);
 
  if (!record) {
    notFound();
  }
 
  const { data: checkups } = await supabase
    .from('prenatal_checkups')
    .select('id, trimester, checkup_date, blood_pressure, weight_kg, notes')
    .eq('pregnant_mother_id', id);
 
  const fullName = [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(' ');
 
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">
          {record.serial_no ?? 'Record'} — {fullName}
        </h1>
        <p className="text-muted">Pregnant Women record details.</p>
      </div>
 
      {/* Registration info */}
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
                   <InfoRow
            label="Risk Level"
            value={record.risk_level === 'high' ? 'High Risk' : 'Low Risk'}
          />
        </div>

        {record.risk_level === 'high' && riskReasons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-muted-2 uppercase tracking-wide mb-2">
              Reason for High Risk
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {riskReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
 
      <PrenatalCheckups motherId={id} initialCheckups={checkups ?? []} canEdit={canEdit} />
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