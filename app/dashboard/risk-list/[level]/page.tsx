import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
 
export const dynamic = 'force-dynamic';
 
export default async function RiskListPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
 
  if (level !== 'high' && level !== 'low') {
    notFound();
  }
 
  const supabase = await createClient();
 
  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, serial_no, full_name, purok, age, contact_number, risk_level')
    .eq('risk_level', level);
 
  // Sort by zone number (1-8), unassigned last
  const sorted = (records ?? []).slice().sort((a, b) => {
    const za = parseInt(a.purok ?? '999') || 999;
    const zb = parseInt(b.purok ?? '999') || 999;
    if (za !== zb) return za - zb;
    return (a.full_name ?? '').localeCompare(b.full_name ?? '');
  });
 
  const isHigh = level === 'high';
 
  return (
    <div>
      <Link href="/dashboard" className="text-sm text-brand hover:underline">
        ← Back to Dashboard
      </Link>
 
      <div className="flex items-center gap-3 mt-3 mb-6">
        <h1 className="text-2xl font-semibold text-ink">
          {isHigh ? 'High Risk' : 'Low Risk'} Pregnant Mothers
        </h1>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            isHigh ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
          }`}
        >
          {sorted.length} total
        </span>
      </div>
 
      <div className="card overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b text-left text-muted">
            <tr>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Contact Number</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-2">
                  No {isHigh ? 'high' : 'low'} risk records found.
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted font-mono text-xs">{r.serial_no ?? '—'}</td>
                <td className="px-4 py-3 font-medium">{r.full_name ?? '—'}</td>
                <td className="px-4 py-3">
                  {r.purok ? `Zone ${r.purok}` : 'Unassigned'}
                </td>
                <td className="px-4 py-3">{r.age ?? '—'}</td>
                <td className="px-4 py-3">{r.contact_number ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/pregnant/${r.id}`}
                    className="text-brand hover:underline text-xs"
                  >
                    View
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