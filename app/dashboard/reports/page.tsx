import { createClient } from '@/utils/supabase/server';
import ReportExport, { type ReportRow } from '@/components/ReportExport';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, date_registered, first_name, middle_name, last_name, address, purok, age, contact_number, lmp, edd, gravida_para, blood_pressure, height_cm, weight_kg, risk_level'
    )
    .order('serial_no', { ascending: true });

  const rows: ReportRow[] = (records ?? []).map((r) => ({
    serial_no: r.serial_no,
    date_registered: r.date_registered,
    name: [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' '),
    address: r.address,
    purok: r.purok,
    age: r.age,
    contact_number: r.contact_number,
    lmp: r.lmp,
    edd: r.edd,
    gravida_para: r.gravida_para,
    blood_pressure: r.blood_pressure,
    height_cm: r.height_cm,
    weight_kg: r.weight_kg,
    risk_level: r.risk_level,
  }));

  const total = rows.length;
  const highRisk = rows.filter((r) => r.risk_level === 'high').length;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Reports</h1>
          <p className="text-muted">
            Export the full pregnant mothers registry as a spreadsheet.
          </p>
        </div>
        <ReportExport records={rows} />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
          Failed to load records: {error.message}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-muted mb-1">Total Records</p>
          <p className="text-2xl font-semibold text-ink">{total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted mb-1">High Risk</p>
          <p className="text-2xl font-semibold text-red-600">{highRisk}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b text-left text-muted">
            <tr>
              <th className="px-4 py-3">Serial No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Purok</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">EDC</th>
              <th className="px-4 py-3">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-2">
                  No records to report yet.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  {r.serial_no ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium">{r.name || '—'}</td>
                <td className="px-4 py-3">{r.purok ?? '—'}</td>
                <td className="px-4 py-3">{r.age ?? '—'}</td>
                <td className="px-4 py-3">{r.edd ?? '—'}</td>
                <td className="px-4 py-3">
                  {r.risk_level ? (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        r.risk_level === 'high'
                          ? 'bg-red-100 text-red-700'
                          : r.risk_level === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {r.risk_level}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
