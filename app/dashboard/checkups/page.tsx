import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PrenatalCheckupsPage() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, serial_no, first_name, middle_name, last_name, purok, edd')
    .order('serial_no', { ascending: true });

  // Get checkup counts per mother
  const { data: checkupCounts } = await supabase
    .from('prenatal_checkups')
    .select('pregnant_mother_id');

  const countsByMother: Record<string, number> = {};
  checkupCounts?.forEach((c) => {
    countsByMother[c.pregnant_mother_id] = (countsByMother[c.pregnant_mother_id] || 0) + 1;
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Prenatal Checkups</h1>
      <p className="text-gray-600 mb-6">
        Select a pregnant mother to view or record her 1st–3rd trimester checkups.
      </p>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Purok</th>
              <th className="px-4 py-3">EDC</th>
              <th className="px-4 py-3">Checkups Recorded</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(!records || records.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No pregnant mothers registered yet.
                </td>
              </tr>
            )}
            {records?.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {r.serial_no ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium">
                  {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ')}
                </td>
                <td className="px-4 py-3">{r.purok ?? '—'}</td>
                <td className="px-4 py-3">{r.edd ?? '—'}</td>
                <td className="px-4 py-3">{countsByMother[r.id] ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/pregnant/${r.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View Checkups
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}