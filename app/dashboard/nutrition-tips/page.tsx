import { collectRows } from '@/utils/supabase/collectRows';
import TipsContentLibrary from '@/components/tips/TipsContentLibrary';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireHealthTipsManagement } from '@/utils/auth/middleware';
import PageHeader from '@/components/ui/PageHeader';
import { Salad } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NutritionTipsPage() {
  const { supabase } = await requireHealthTipsManagement();

  const { data: monthlyTips } = await supabase
    .from('monthly_tips')
    .select('id, month, risk_level, title, content')
    .order('month', { ascending: true })
    .order('risk_level', { ascending: true });

  // Advice library is service-only by RLS, so the server reads it for the nurse view.
  const { data: adviceRows } = await collectRows((start, end) => createAdminClient()
    .from('indicator_monthly_advice')
    .select('indicator_label, month, content')
    .order('month', { ascending: true }).order('indicator_label').range(start, end));

  const { data: tipRefs } = await collectRows((start, end) => createAdminClient()
    .from('tip_references')
    .select('position, citation')
    .order('position', { ascending: true }).range(start, end));

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        title="Health & Nutrition Tips"
        subtitle="Browse month-by-month maternal guidance and references"
        icon={Salad}
        badge="Maternal Care"
      />

      <TipsContentLibrary
        advice={adviceRows ?? []}
        lowTips={(monthlyTips ?? []).filter((tip) => tip.risk_level === 'low').map((tip) => ({ month: tip.month, content: tip.content }))}
        references={tipRefs ?? []}
        refsManaged={(tipRefs ?? []).length > 0}
      />
    </div>
  );
}
