import { createClient } from '@/utils/supabase/server';
import MonthlyTipsManager from '@/components/tips/MonthlyTipsManager';

export const dynamic = 'force-dynamic';

export default async function HealthTipsPage() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from('pregnant_mothers')
    .select('id, first_name, middle_name, last_name, risk_level, lmp')
    .order('serial_no', { ascending: true });

  const { data: monthlyTips } = await supabase
    .from('monthly_tips')
    .select('id, month, risk_level, title, content')
    .order('month', { ascending: true })
    .order('risk_level', { ascending: true });

  const { data: broadcasts } = await supabase
    .from('tip_broadcasts')
    .select('id, month, risk_level, period, title, content, status, created_at, approved_at, sent_at')
    .order('created_at', { ascending: false });

  const broadcastIds = broadcasts?.map((b) => b.id) ?? [];
  const { data: recipients } = broadcastIds.length
    ? await supabase
        .from('tip_broadcast_recipients')
        .select('broadcast_id, pregnant_mother_id, sent, pregnant_mothers(full_name)')
        .in('broadcast_id', broadcastIds)
    : { data: [] };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Health Tips</h1>
        <p className="text-muted">
          Manage monthly nutrition & health tip templates, review pending messages, and broadcast tips to pregnant mothers.
        </p>
      </div>

      <MonthlyTipsManager
        monthlyTips={monthlyTips ?? []}
        pregnantMothers={records ?? []}
        broadcasts={broadcasts ?? []}
        recipients={(recipients ?? []).map((recipient) => ({
          ...recipient,
          pregnant_mothers: Array.isArray(recipient.pregnant_mothers)
            ? recipient.pregnant_mothers[0] ?? { full_name: '' }
            : recipient.pregnant_mothers ?? { full_name: '' },
        }))}
      />
    </div>
  );
}
