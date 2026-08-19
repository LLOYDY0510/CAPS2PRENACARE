import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export default async function PregnantRecordsPage() {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, age, purok, contact_number, edd, risk_level')
    .order('created_at', { ascending: false });

  const RISK_STYLES: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Pregnant Records</h1>
          <p className="text-gray-600">
            {records?.length ?? 0} registered pregnant mother
            {records?.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/dashboard/pregnant/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          + Register Pregnant Mother
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">
          Failed to load records: {error.message}
        </p>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Purok</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(!records || records.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No pregnant mothers registered yet.
                </td>
              </tr>
            )}
            {records?.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{r.full_name}</td>
                <td className="px-4 py-3">{r.age ?? '—'}</td>
                <td className="px-4 py-3">{r.purok ?? '—'}</td>
                <td className="px-4 py-3">{r.contact_number ?? '—'}</td>
                <td className="px-4 py-3">{r.edd ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      RISK_STYLES[r.risk_level] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {r.risk_level}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/pregnant/${r.id}`}
                    className="text-blue-600 hover:underline"
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