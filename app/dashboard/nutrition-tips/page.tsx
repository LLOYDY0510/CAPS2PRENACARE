import MonthlyTipsManager from '@/components/tips/MonthlyTipsManager';
import { requireRoles } from '@/utils/auth/roles';
import PageHeader from '@/components/ui/PageHeader';
import { Salad } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NutritionTipsPage() {
  const { supabase } = await requireRoles(['nurse']);

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

  const broadcastIds = broadcasts?.map((broadcast) => broadcast.id) ?? [];
  const { data: recipients } = broadcastIds.length
    ? await supabase
        .from('tip_broadcast_recipients')
        .select('broadcast_id, pregnant_mother_id, sent, pregnant_mothers(full_name)')
        .in('broadcast_id', broadcastIds)
    : { data: [] };

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        title="Nutrition &amp; Monthly Tips"
        subtitle="Manage gestational month guidance, review clinical broadcasts, and send notifications"
        icon={Salad}
        badge="Maternal Care"
      />

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