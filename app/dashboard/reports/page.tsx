import { createClient } from '@/utils/supabase/server';
import ReportsTable from '@/components/reports/ReportsTable';
import { type ReportRow } from '@/components/reports/ReportExport';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = await createClient();

  // Main records
  const { data: records, error } = await supabase
    .from('pregnant_mothers')
    .select(
      'id, serial_no, date_registered, first_name, middle_name, last_name, address, purok, age, contact_number, lmp, edd, gravida_para, blood_pressure, height_cm, weight_kg, risk_level'
    )
    .order('serial_no', { ascending: true });

  // Checkup counts per mother
  const { data: checkupRows } = await supabase
    .from('prenatal_checkups')
    .select('pregnant_mother_id');

  const checkupCounts: Record<string, number> = {};
  checkupRows?.forEach((c) => {
    checkupCounts[c.pregnant_mother_id] = (checkupCounts[c.pregnant_mother_id] || 0) + 1;
  });

  // Next prenatal schedule per mother
  const today = new Date().toISOString().slice(0, 10);
  const { data: scheduleRows } = await supabase
    .from('prenatal_schedules')
    .select('pregnant_mother_id, visit_date')
    .gte('visit_date', today)
    .order('visit_date', { ascending: true });

  // Keep only the earliest upcoming visit per mother
  const nextVisit: Record<string, string> = {};
  scheduleRows?.forEach((s) => {
    if (!nextVisit[s.pregnant_mother_id]) {
      nextVisit[s.pregnant_mother_id] = s.visit_date;
    }
  });

  const rows: ReportRow[] = (records ?? []).map((r) => ({
    serial_no:       r.serial_no,
    date_registered: r.date_registered,
    name:            [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' '),
    address:         r.address,
    purok:           r.purok,
    age:             r.age,
    contact_number:  r.contact_number,
    lmp:             r.lmp,
    edd:             r.edd,
    gravida_para:    r.gravida_para,
    blood_pressure:  r.blood_pressure,
    height_cm:       r.height_cm,
    weight_kg:       r.weight_kg,
    risk_level:      r.risk_level,
  }));

  // Extra metadata passed to the client table (not part of ReportRow export type)
  const meta: Record<string, { checkupCount: number; nextVisit: string | null }> = {};
  (records ?? []).forEach((r) => {
    meta[r.id] = {
      checkupCount: checkupCounts[r.id] ?? 0,
      nextVisit:    nextVisit[r.id] ?? null,
    };
  });

  // Attach id to rows for meta lookup — passed separately so ReportRow stays unchanged
  const rowsWithId = (records ?? []).map((r, i) => ({
    ...rows[i],
    _id: r.id,
  }));

  return (
    <div>
      {error && (
        <div className="alert-error mb-4">
          Failed to load records: {error.message}
        </div>
      )}

      <ReportsTable rowsWithId={rowsWithId} meta={meta} />
    </div>
  );
}
