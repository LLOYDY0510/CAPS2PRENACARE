import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import RiskListTable from '@/components/pregnant/RiskListTable';

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

  // Sort by zone number, unassigned last
  const sorted = (records ?? []).slice().sort((a, b) => {
    const za = parseInt(a.purok ?? '999') || 999;
    const zb = parseInt(b.purok ?? '999') || 999;
    if (za !== zb) return za - zb;
    return (a.full_name ?? '').localeCompare(b.full_name ?? '');
  });

  const isHigh = level === 'high';

  return (
    <div>
      <Link href="/dashboard" style={{ fontSize: '0.8125rem', color: 'var(--brand)' }}>
        ← Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mt-3 mb-6">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>{isHigh ? 'High Risk' : 'Low Risk'} Pregnant Mothers</h1>
        </div>
        <span className={isHigh ? 'badge-high' : 'badge-low'}>
          {sorted.length} total
        </span>
      </div>

      <RiskListTable records={sorted} isHigh={isHigh} />
    </div>
  );
}
