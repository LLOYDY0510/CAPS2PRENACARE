import 'server-only';
import { createAdminClient } from '@/utils/supabase/admin';
import { collectRows } from '@/utils/supabase/collectRows';
import { collectInRows } from '@/utils/supabase/collectInRows';
import { sendSmsAndLog, buildDedupeKey } from './sendSms';
import { composeHighRiskAdvice } from './highRiskAdvice';
import { toE164 } from './phone';
import type { SmsEventSummary } from './eventFeedback';

type EventRow = {
  event_key: string;
  pregnant_mother_id: string;
  message: string;
  message_type: 'care_message' | 'health_tip' | 'nutrition_tip';
  pregnant_mothers: { contact_number: string | null; full_name: string | null } | { contact_number: string | null; full_name: string | null }[] | null;
};

function eventTarget(row: EventRow) {
  const mother = Array.isArray(row.pregnant_mothers) ? row.pregnant_mothers[0] : row.pregnant_mothers;
  return { pregnantMotherId: row.pregnant_mother_id, contactNumber: mother?.contact_number ?? null, fullName: mother?.full_name ?? null };
}

function dispatchKey(row: EventRow) {
  return buildDedupeKey({ eventKey: row.event_key, motherId: row.pregnant_mother_id,
    phone: '', scheduleId: null, sendKind: 'auto', message: row.message });
}

async function readEvent(eventKey: string) {
  const admin = createAdminClient();
  const { data, error } = await collectRows<EventRow>((start, end) => admin.from('maternal_sms_events')
    .select('event_key,pregnant_mother_id,message,message_type,pregnant_mothers(contact_number,full_name)')
    .eq('event_key', eventKey).order('pregnant_mother_id').range(start, end));
  if (error) throw new Error('SMS event storage is unavailable. Apply migration 033 before using event SMS.');
  if (!data?.length) throw new Error('No SMS event is available for this record. Historical records are not sent registration SMS.');
  const keys = data.map(dispatchKey);
  const { data: claims, error: claimError } = await collectInRows(keys, (batch, start, end) => admin
    .from('sms_dispatch_claims').select('dedupe_key,state').in('dedupe_key', batch).order('dedupe_key').range(start, end));
  if (claimError) throw new Error('SMS dispatch status could not be read. No message was submitted.');
  return { rows: data, claims: new Map((claims ?? []).map(row => [row.dedupe_key as string, row.state as string])) };
}

function summarize(event: Awaited<ReturnType<typeof readEvent>>): SmsEventSummary {
  const summary: SmsEventSummary = { total: event.rows.length, submitted: 0, failed: 0, invalid: 0, blocked: 0, pending: 0 };
  for (const row of event.rows) {
    const state = event.claims.get(dispatchKey(row));
    if (state === 'accepted') summary.submitted++;
    else if (state === 'unknown' || state === 'reserved') summary.blocked++;
    else if (!toE164(eventTarget(row).contactNumber)) summary.invalid++;
    else if (state === 'failed') summary.failed++;
    else summary.pending++;
  }
  return summary;
}

export async function getSmsEventSummary(eventKey: string): Promise<SmsEventSummary> {
  return summarize(await readEvent(eventKey));
}

type IndicatorLinkRow = {
  risk_indicators: { label: string; indicator_type: string; advice_message: string | null } | { label: string; indicator_type: string; advice_message: string | null }[] | null;
};

// Queue and send the high-risk advice SMS for a new registration. Returns
// null when the mother has no recorded indicators to advise on.
export async function dispatchRegistrationAdvice(motherId: string, actorId: string): Promise<SmsEventSummary | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('pregnant_mother_indicators')
    .select('risk_indicators(label,indicator_type,advice_message)').eq('pregnant_mother_id', motherId);
  if (error) throw new Error('High-risk indicators could not be loaded for the advice SMS.');
  const indicators = ((data ?? []) as IndicatorLinkRow[]).map(row => {
    const ref = Array.isArray(row.risk_indicators) ? row.risk_indicators[0] : row.risk_indicators;
    return { label: ref?.label ?? '', indicator_type: ref?.indicator_type ?? 'checklist', advice_message: ref?.advice_message ?? null };
  });
  const message = composeHighRiskAdvice(indicators);
  if (!message) return null;
  const eventKey = `registration-advice:${motherId}`;
  const { error: queueError } = await admin.from('maternal_sms_events')
    .upsert({ event_key: eventKey, pregnant_mother_id: motherId, message, message_type: 'care_message', created_by: actorId },
      { onConflict: 'event_key,pregnant_mother_id', ignoreDuplicates: true });
  if (queueError) throw new Error('The advice SMS could not be queued.');
  return dispatchSmsEvent(eventKey, actorId);
}

// Bound provider work per request; durable events can be resumed after interruption.
export async function dispatchSmsEvent(eventKey: string, actorId: string | null): Promise<SmsEventSummary> {
  const event = await readEvent(eventKey);
  const pending = event.rows.filter(row => !event.claims.has(dispatchKey(row)) && toE164(eventTarget(row).contactNumber));
  const eligible = pending.length ? pending : event.rows.filter(row => {
    const state = event.claims.get(dispatchKey(row));
    return !state || state === 'failed';
  });
  const first = eligible.find(row => toE164(eventTarget(row).contactNumber));
  if (!first) return summarize(event);
  const matching = eligible.filter(row => row.message === first.message && row.message_type === first.message_type
    && toE164(eventTarget(row).contactNumber));
  const numbers = new Set([...new Set(matching.map(row => toE164(eventTarget(row).contactNumber)))].slice(0, 50));
  // Keep mothers sharing a phone in the same provider submission.
  const batch = matching.filter(row => numbers.has(toE164(eventTarget(row).contactNumber)));
  const result = await sendSmsAndLog({ targets: batch.map(eventTarget), message: first.message,
    messageType: first.message_type, sendKind: 'auto', eventKey, sentBy: actorId });
  const summary = await getSmsEventSummary(eventKey);
  summary.dryRun = result.dryRun;
  // Duplicate outcomes include in-flight claims, so read persistent status above.
  if (result.failed.length || (result.batchError && !result.skipped.length)) {
    summary.detail = result.friendlyError ?? result.batchError ?? 'One or more SMS submissions failed.';
  }
  if (result.warnings.length && !summary.detail) summary.detail = result.warnings.join(' ');
  return summary;
}
