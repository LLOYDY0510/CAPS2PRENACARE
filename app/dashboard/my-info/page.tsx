import InfoRow from '@/components/ui/InfoRow';
import { AccountNotLinked, RecordNotFound } from '@/components/ui/PatientNotices';
import { getPatientContext } from '@/utils/patient';
import PageHeader from '@/components/ui/PageHeader';
import { User } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MyInfoPage() {
  const { supabase, pregnantMotherId } = await getPatientContext();

  if (!pregnantMotherId) return <AccountNotLinked />;

  const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('*')
    .eq('id', pregnantMotherId)
    .single();

  if (!record) return <RecordNotFound />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="My Information"
        icon={User}
        subtitle={record.serial_no}
      />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Personal Details</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow label="Date Registered" value={record.date_registered} />
          <InfoRow label="Address" value={record.address} />
          <InfoRow label="Zone" value={record.purok ? `Zone ${record.purok}` : null} />
          <InfoRow label="Age" value={record.age} />
          <InfoRow label="Contact Number" value={record.contact_number} />
          <InfoRow label="LMP" value={record.lmp} />
          <InfoRow label="EDC" value={record.edd} />
          <InfoRow label="Gravida-Para" value={record.gravida_para} />
        </div>
      </div>
    </div>
  );
}
