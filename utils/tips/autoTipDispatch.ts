import 'server-only';

import { createAdminClient } from '@/utils/supabase/admin';
import { createMaternalNotification } from '@/utils/notifications';
import { dispatchSmsEvent } from '@/utils/sms/events';
import { localDate } from '@/utils/calendar';
import {
  adviceSlug,
  autoTipEventKey,
  pregnancyMonth,
  resolveAdviceLabel,
  tipNoticeText,
  tipSmsText,
  tipTitle,
} from '@/utils/tips/autoTips';

export type AutoTipTotals = {
  total: number;
  submitted: number;
  failed: number;
  invalid: number;
  blocked: number;
  pending: number;
};

export type AutoTipResult = {
  month: number | null;
  sms: AutoTipTotals;
  notices: number;
  skipped: string[];
};

const ZERO: AutoTipTotals = { total: 0, submitted: 0, failed: 0, invalid: 0, blocked: 0, pending: 0 };

function skip(month: number | null, reason: string): AutoTipResult {
  return { month, sms: { ...ZERO }, notices: 0, skipped: [reason] };
}

/* Queue and send the current month's risk tip(s) for one mother. Idempotent per month. */
export async function sendCurrentMonthTips(motherId: string, actorId: string | null): Promise<AutoTipResult> {
  const admin = createAdminClient();
  const { data: mother } = await admin
    .from('pregnant_mothers')
    .select('id,lmp,risk_level')
    .eq('id', motherId)
    .maybeSingle();
  if (!mother) return skip(null, 'missing-mother');

  const month = pregnancyMonth(mother.lmp);
  if (!month) return skip(null, 'no-month');

  // A sent manual broadcast for this month wins; never double-send the month.
  const period = localDate().slice(0, 7);
  const { data: covered } = await admin
    .from('tip_broadcast_recipients')
    .select('broadcast_id,tip_broadcasts!inner(month,period,status)')
    .eq('pregnant_mother_id', motherId)
    .eq('tip_broadcasts.month', month)
    .eq('tip_broadcasts.period', period)
    .eq('tip_broadcasts.status', 'sent')
    .limit(1);
  if (covered?.length) return skip(month, 'manual-sent');

  const high = mother.risk_level === 'high';
  const jobs: { slug: string; content: string }[] = [];
  if (high) {
    const { data: links } = await admin
      .from('pregnant_mother_indicators')
      .select('risk_indicators(label,indicator_type)')
      .eq('pregnant_mother_id', motherId);
    const labels = new Set<string>();
    for (const link of links ?? []) {
      const ref = link.risk_indicators as { label?: string; indicator_type?: string } | { label?: string; indicator_type?: string }[] | null;
      const row = Array.isArray(ref) ? ref[0] : ref;
      labels.add(resolveAdviceLabel(row?.label, row?.indicator_type));
    }
    if (labels.size === 0) labels.add(resolveAdviceLabel(null));
    for (const label of labels) {
      const { data: row } = await admin
        .from('indicator_monthly_advice')
        .select('content')
        .eq('indicator_label', label)
        .eq('month', month)
        .maybeSingle();
      if (row?.content) jobs.push({ slug: adviceSlug(label), content: row.content as string });
    }
    if (jobs.length === 0) return skip(month, 'no-content');
  } else {
    const { data: template } = await admin
      .from('monthly_tips')
      .select('content')
      .eq('month', month)
      .eq('risk_level', 'low')
      .maybeSingle();
    if (!template?.content) return skip(month, 'no-content');
    jobs.push({ slug: 'lowrisk', content: template.content as string });
  }

  const sms: AutoTipTotals = { ...ZERO };
  let notices = 0;
  for (const job of jobs) {
    const eventKey = autoTipEventKey(motherId, month, job.slug);
    const { error: queueError } = await admin.from('maternal_sms_events').upsert(
      {
        event_key: eventKey,
        pregnant_mother_id: motherId,
        message: tipSmsText(job.content, high),
        message_type: 'health_tip',
        created_by: actorId,
      },
      { onConflict: 'event_key,pregnant_mother_id', ignoreDuplicates: true },
    );
    if (queueError) throw new Error('The monthly tip SMS could not be queued.');
    const notice = await createMaternalNotification(admin, {
      pregnantMotherId: motherId,
      eventKey,
      category: 'health_tip',
      title: tipTitle(month, high),
      message: tipNoticeText(job.content, high),
    });
    if (notice) notices++;
    const summary = await dispatchSmsEvent(eventKey, actorId);
    sms.total += summary.total;
    sms.submitted += summary.submitted;
    sms.failed += summary.failed;
    sms.invalid += summary.invalid;
    sms.blocked += summary.blocked;
    sms.pending += summary.pending;
  }
  return { month, sms, notices, skipped: [] };
}
