import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import DeleteRecordButton from '@/components/DeleteRecordButton';

export default async function PregnantRecordsPage() {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, date_registered, first_name, middle_name, last_name, address, age, lmp, gravida_para, edd, blood_pressure, height_cm, weight_kg'
    )
    .order('serial_no', { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Pregnant Records</h1>
          <p className="text-muted">
            {records?.length ?? 0} registered pregnant mother
            {records?.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/dashboard/pregnant/new"
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-dark transition"
        >
          + Register Pregnant Mother
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">
          Failed to load records: {error.message}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b text-left text-muted">
            <tr>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Date Registered</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">LMP</th>
              <th className="px-4 py-3">G-P</th>
              <th className="px-4 py-3">EDC</th>
              <th className="px-4 py-3">BP</th>
              <th className="px-4 py-3">Height (cm)</th>
              <th className="px-4 py-3">Weight (kg)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(!records || records.length === 0) && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-muted-2">
                  No pregnant mothers registered yet.
                </td>
              </tr>
            )}
            {records?.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted font-mono text-xs">{r.serial_no ?? '—'}</td>
                <td className="px-4 py-3">{r.date_registered ?? '—'}</td>
                <td className="px-4 py-3 font-medium">
                  {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-3">{r.address ?? '—'}</td>
                <td className="px-4 py-3">{r.age ?? '—'}</td>
                <td className="px-4 py-3">{r.lmp ?? '—'}</td>
                <td className="px-4 py-3">{r.gravida_para ?? '—'}</td>
                <td className="px-4 py-3">{r.edd ?? '—'}</td>
                <td className="px-4 py-3">{r.blood_pressure ?? '—'}</td>
                <td className="px-4 py-3">{r.height_cm ?? '—'}</td>
                <td className="px-4 py-3">{r.weight_kg ?? '—'}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link
                    href={`/dashboard/pregnant/${r.id}`}
                    className="text-brand hover:underline"
                  >
                    View
                  </Link>
                  <DeleteRecordButton id={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}