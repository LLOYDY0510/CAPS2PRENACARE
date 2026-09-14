import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MyInfoPage() {
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
    .select('*')
    .eq('id', pregnantMotherId)
    .single();

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
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">My Information</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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

function InfoRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-muted-2 text-xs mb-0.5">{label}</p>
      <p className="text-gray-800">{value ?? '—'}</p>
    </div>
  );
}