import { createClient } from '@/utils/supabase/server';
import ScheduleSmsForm from '../../../components/ScheduleSmsForm';

export const dynamic = 'force-dynamic';

export default async function PrenatalSchedulePage() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, purok, contact_number, edd')
    .order('full_name', { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Prenatal Schedule</h1>
      <p className="text-muted mb-6">
        Select pregnant mothers and send a prenatal checkup reminder via SMS.
      </p>

      <ScheduleSmsForm records={records ?? []} />
    </div>
  );
}