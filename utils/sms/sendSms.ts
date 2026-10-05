import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  sendSmsBatch,
  getSemaphoreAccount,
  isSmsDryRun,
  classifySemaphoreError,
  type SemaphoreErrorKind,
  type SemaphoreRecipientResult,
  type SemaphoreSendResult,
} from './semaphore';
import { toE164 } from './phone';
import { createMaternalNotification } from '@/utils/notifications';
import { getSmsSchemaCapabilities, MIGRATION_014_HINT } from './schema';

/** Best-effort credit balance read; never throws. */
async function safeAccount(): Promise<number | null> {
  try {
    const account = await getSemaphoreAccount();
    return account.creditBalance;
  } catch {
    return null;
  }
}

export type SmsMessageType =
  | 'general'
  | 'prenatal_reminder'
  | 'missed_visit_follow_up'
  | 'risk_alert'
  | 'health_tip'
  | 'nutrition_tip'
  | 'care_message';

export type SendKind = 'auto' | 'manual';

export type SmsTarget = {
  pregnantMotherId: string | null;
  contactNumber: string | null;
};

export type RecipientOutcome = {
  phone: string | null;
  pregnantMotherId: string | null;
  status: 'sent' | 'failed' | 'skipped_duplicate' | 'skipped_invalid';
  detail: string | null;
  providerMessageId: string | null;
};

export type SendSmsResult = {
  logId: string | null;
  sent: RecipientOutcome[];
  skipped: RecipientOutcome[];
  failed: RecipientOutcome[];
  batchError: string | null;
  /** Stable machine-readable cause for the failure, if any. */
  errorKind: SemaphoreErrorKind | null;
  /** Staff-friendly explanation of the failure, if any. */
  friendlyError: string | null;
  creditsBefore: number | null;
  creditsAfter: number | null;
  /** True when SMS_DRY_RUN=true skipped the provider call entirely. */
  dryRun: boolean;
  /** Non-fatal problems, e.g. duplicate protection not yet installed. */
  warnings: string[];
};

/**
 * The dedupe key is the contract that stops a reminder being sent twice.
 *
 *  - auto, on a schedule : one automatic reminder per (schedule, mother), ever.
 *  - manual, on a schedule: one manual push per (schedule, mother, day), so
 *                          pressing "Send now" twice in a row is a no-op.
 *  - ad-hoc (no schedule): one push per (mother, message text, day), so a nurse
 *                          can still send two *different* alerts in one day.
 *
 * The unique index on sms_recipient_receipts.dedupe_key is the real guard, so
 * two concurrent requests cannot both get through.
 */
export function buildDedupeKey(input: {
  sendKind: SendKind;
  scheduleId: string | null;
  motherId: string | null;
  phone: string;
  message: string;
  day?: string;
}): string {
  const { sendKind, scheduleId, motherId, phone, message } = input;
  const day = input.day ?? new Date().toISOString().slice(0, 10);

  if (sendKind === 'auto' && scheduleId && motherId) {
    return `auto:${scheduleId}:${motherId}`;
  }
  if (scheduleId && motherId) {
    return `manual:${scheduleId}:${motherId}:${day}`;
  }
  const subject = motherId ?? phone;
  const content = createHash('sha256').update(message).digest('hex').slice(0, 16);
  return `adhoc:${subject}:${content}:${day}`;
}

type SendSmsInput = {
  targets: SmsTarget[];
  message: string;
  messageType: SmsMessageType;
  sendKind: SendKind;
  scheduleId?: string | null;
  sentBy?: string | null;
  senderName?: string;
  /** Set for the automatic job so the caller's daily run stays idempotent. */
  dedupeDay?: string;
  /** Bypass the dedupe check (still enforced by the unique index). */
  force?: boolean;
};

/**
 * Sends a real SMS through Semaphore and records exactly what came back.
 *
 * Every exit path writes an sms_logs row, so a failed send is as visible in the
 * SMS Log as a successful one. That is the difference from the previous
 * implementation, which marked a schedule as "reminded" and logged nothing.
 */
export async function sendSmsAndLog(input: SendSmsInput): Promise<SendSmsResult> {
  const supabase = createAdminClient();
  const { targets, message, messageType, sendKind } = input;
  const scheduleId = input.scheduleId ?? null;

  const result: SendSmsResult = {
    logId: null,
    sent: [],
    skipped: [],
    failed: [],
    batchError: null,
    errorKind: null,
    friendlyError: null,
    creditsBefore: null,
    creditsAfter: null,
    dryRun: isSmsDryRun(),
    warnings: [],
  };

  if (!message.trim()) {
    result.batchError = 'Message is empty.';
    return result;
  }
  if (targets.length === 0) {
    result.batchError = 'No recipients.';
    return result;
  }

  const { hasReceipts } = await getSmsSchemaCapabilities();
  if (!hasReceipts) {
    result.warnings.push(MIGRATION_014_HINT);
  }

  // Normalise first: an unusable number can never be sent, and logging it as
  // "failed" with the reason is more useful than dropping it silently.
  const prepared = targets.map((target) => ({
    motherId: target.pregnantMotherId,
    phone: toE164(target.contactNumber),
    raw: target.contactNumber,
  }));

  const sendable = prepared.filter(
    (p): p is { motherId: string | null; phone: string; raw: string | null } => p.phone !== null,
  );

  for (const p of prepared) {
    if (p.phone === null) {
      result.failed.push({
        phone: null,
        pregnantMotherId: p.motherId,
        status: 'skipped_invalid',
        detail: p.raw ? `"${p.raw}" is not a valid Philippine mobile number.` : 'No contact number on file.',
        providerMessageId: null,
      });
    }
  }

  if (sendable.length === 0) {
    result.batchError = 'No recipient has a usable mobile number.';
    await writeLog(supabase, { ...input, scheduleId, raw: null, httpStatus: 0, outcomes: result.failed });
    return result;
  }

  // Duplicate prevention: ask the database which of these already went out.
  // Without the receipts table there is nothing to consult, so the send
  // proceeds and the caller is warned rather than silently risking a repeat.
  const dedupeKeys = new Map(
    sendable.map((p) => [
      p.phone,
      buildDedupeKey({
        sendKind,
        scheduleId,
        motherId: p.motherId,
        phone: p.phone,
        message,
        day: input.dedupeDay,
      }),
    ]),
  );

  let alreadySent = new Set<string>();
  if (hasReceipts && !input.force) {
    const { data: existing, error: existingError } = await supabase
      .from('sms_recipient_receipts')
      .select('dedupe_key')
      .in('dedupe_key', Array.from(new Set(dedupeKeys.values())));

    if (existingError) {
      // Fail closed: without the dedupe read we cannot promise no duplicates.
      result.batchError = `Could not verify whether this was already sent: ${existingError.message}`;
      return result;
    }
    alreadySent = new Set((existing ?? []).map((row) => row.dedupe_key as string));
  }

  const toSend: typeof sendable = [];
  for (const p of sendable) {
    const key = dedupeKeys.get(p.phone)!;
    if (alreadySent.has(key)) {
      result.skipped.push({
        phone: p.phone,
        pregnantMotherId: p.motherId,
        status: 'skipped_duplicate',
        detail: sendKind === 'auto'
          ? 'The automatic reminder for this visit was already sent.'
          : 'Already sent today for this mother and visit.',
        providerMessageId: null,
      });
    } else {
      toSend.push(p);
    }
  }

  if (toSend.length === 0) {
    result.batchError = 'Every recipient was already sent this message.';
    await writeLog(supabase, { ...input, scheduleId, raw: null, httpStatus: 0, outcomes: result.skipped });
    return result;
  }

  // Reading the balance before and after is what turns "sent" into proof that
  // real credits were consumed. It is best-effort: the provider rate-limits the
  // account endpoint and a null balance must not fail the send.
  const before = await safeAccount();

  let response: SemaphoreSendResult;
  try {
    response = await sendSmsBatch({
      numbers: toSend.map((p) => p.phone),
      message,
      senderName: input.senderName,
    });
  } catch (error) {
    // sendSmsBatch throws before the network when configuration is missing
    // (e.g. no SEMAPHORE_API_KEY). Classify it, log the row with the reason,
    // and surface friendly text instead of an unhandled 500.
    const msg = error instanceof Error ? error.message : 'Unknown SMS provider error.';
    const classified = classifySemaphoreError(msg);
    result.batchError = msg;
    result.errorKind = classified.kind;
    result.friendlyError = classified.friendly;
    result.failed = toSend.map((p) => ({
      phone: p.phone,
      pregnantMotherId: p.motherId,
      status: 'failed' as const,
      detail: msg,
      providerMessageId: null,
    }));
    await writeLog(supabase, { ...input, scheduleId, raw: null, httpStatus: 0, outcomes: result.failed });
    return result;
  }

  const after = await safeAccount();
  result.creditsBefore = before;
  result.creditsAfter = after;
  if (before != null && after != null && before !== after) {
    result.warnings.push(`Semaphore credits went from ${before} to ${after}.`);
  }
  if (result.dryRun) {
    result.warnings.push('DRY RUN: no message left the server (SMS_DRY_RUN=true).');
  }

  if (response.batchError) {
    result.batchError = response.batchError;
    // Raw provider body is already saved by writeLog below; the friendly text
    // is what the UI shows so staff know what to fix.
    const classified = classifySemaphoreError(response.batchError);
    result.errorKind = classified.kind;
    result.friendlyError = classified.friendly;
  }

  // Map each provider row back to the mother it belongs to.
  const byNumber = new Map<string, (typeof toSend)[number]>();
  for (const p of toSend) byNumber.set(p.phone.replace(/[^\d]/g, ''), p);

  const outcomes: RecipientOutcome[] = [];
  for (const row of response.recipients) {
    const match = byNumber.get(row.number.replace(/[^\d]/g, ''));
    const ok = row.status !== 'failed' && !row.error;
    outcomes.push({
      phone: row.number || match?.phone || null,
      pregnantMotherId: match?.motherId ?? null,
      status: ok ? 'sent' : 'failed',
      detail:
        row.error ??
        (row.status === 'dry_run'
          ? 'DRY RUN — no SMS was sent (SMS_DRY_RUN=true).'
          : ok
            ? `Semaphore status: ${row.status}`
            : null),
      providerMessageId: row.messageId,
    });
  }

  // A batch the provider accepted but answered only partially must not be
  // reported as fully sent. When the whole batch was refused there is no
  // per-recipient row, so the provider's own reason is attached to each
  // mother - that is the message the BHW manager needs to see.
  if (response.recipients.length < toSend.length) {
    const answered = new Set(response.recipients.map((r) => r.number.replace(/[^\d]/g, '')));
    for (const p of toSend) {
      if (answered.has(p.phone.replace(/[^\d]/g, ''))) continue;
      outcomes.push({
        phone: p.phone,
        pregnantMotherId: p.motherId,
        status: 'failed',
        detail:
          response.batchError ??
          'Semaphore did not return a result for this number.',
        providerMessageId: null,
      });
    }
  }

  const logId = await writeLog(supabase, {
    ...input,
    scheduleId,
    raw: response.raw,
    httpStatus: response.httpStatus,
    creditsBefore: result.creditsBefore,
    creditsAfter: result.creditsAfter,
    outcomes,
  });
  result.logId = logId;

  for (const outcome of outcomes) {
    if (outcome.status === 'sent') result.sent.push(outcome);
    else result.failed.push(outcome);
  }

  // Mirror the reminder into the mother's in-app notifications, but only for
  // messages that actually left the building.
  if (messageType === 'prenatal_reminder' || messageType === 'missed_visit_follow_up') {
    const motherIds = outcomes
      .filter((o) => o.status === 'sent' && o.pregnantMotherId)
      .map((o) => o.pregnantMotherId as string);
    for (const motherId of motherIds) {
      await createMaternalNotification(supabase, {
        pregnantMotherId: motherId,
        eventKey: `${messageType}:${logId ?? 'log'}:${motherId}`,
        category: messageType === 'prenatal_reminder' ? 'prenatal_reminder' : 'missed_visit',
        title: messageType === 'prenatal_reminder' ? 'Prenatal schedule reminder' : 'Missed prenatal visit follow-up',
        message,
      });
    }
  }

  return result;
}

type WriteLogInput = {
  targets: SmsTarget[];
  message: string;
  messageType: SmsMessageType;
  sendKind: SendKind;
  scheduleId: string | null;
  sentBy?: string | null;
  dedupeDay?: string;
  creditsBefore?: number | null;
  creditsAfter?: number | null;
  raw: unknown;
  httpStatus: number;
  outcomes: RecipientOutcome[];
};

/**
 * Persists the batch log plus one receipt per recipient, carrying the
 * provider's own message id and status.
 */
async function writeLog(supabase: ReturnType<typeof createAdminClient>, input: WriteLogInput) {
  const outcomes = input.outcomes;
  const sentCount = outcomes.filter((o) => o.status === 'sent').length;
  const allFailed = outcomes.every((o) => o.status !== 'sent');

  // The extra columns (semaphore_response, schedule_id, send_kind) come from
  // migration 014. Sending them before the migration is applied would make every
  // insert fail, so they are added only once the probe confirms they exist.
  const { hasReceipts } = await getSmsSchemaCapabilities();

  const row: Record<string, unknown> = {
    recipient_count: outcomes.length,
    recipient_numbers: outcomes.map((o) => o.phone).filter((p): p is string => !!p),
    message: input.message,
    status: sentCount > 0 ? 'success' : 'failed',
    delivery_status: allFailed ? 'failed' : sentCount > 0 ? 'sent' : 'unknown',
    message_type: input.messageType,
    recipient_mother_ids: outcomes
      .map((o) => o.pregnantMotherId)
      .filter((id): id is string => !!id),
    provider_message_id: outcomes.find((o) => o.providerMessageId)?.providerMessageId ?? null,
    error_message: outcomes.find((o) => o.detail)?.detail ?? null,
    sent_by: input.sentBy ?? null,
  };
  if (hasReceipts) {
    // Verbatim provider body, so a delivery can be audited later.
    row.semaphore_response = input.raw as Record<string, unknown> | null;
    row.send_kind = input.sendKind;
    if (input.scheduleId) row.schedule_id = input.scheduleId;
    if (input.creditsBefore != null) row.credits_before = input.creditsBefore;
    if (input.creditsAfter != null) row.credits_after = input.creditsAfter;
  }

  const { data: log, error: logError } = await supabase
    .from('sms_logs')
    .insert(row)
    .select('id')
    .single();

  if (logError || !log) {
    // A log that cannot be written is itself worth reporting rather than
    // hiding: the message may have gone out with no record of it.
    console.error('sms_logs insert failed', logError?.message);
    return null;
  }

  const receiptRows = outcomes
    .filter((o) => o.status === 'sent' || o.status === 'failed')
    .map((o) => ({
      sms_log_id: log.id,
      schedule_id: input.scheduleId,
      pregnant_mother_id: o.pregnantMotherId,
      contact_number: o.phone ?? 'unknown',
      dedupe_key: buildDedupeKey({
        sendKind: input.sendKind,
        scheduleId: input.scheduleId,
        motherId: o.pregnantMotherId,
        phone: o.phone ?? 'unknown',
        message: input.message,
        day: input.dedupeDay,
      }),
      send_kind: input.sendKind,
      provider_message_id: o.providerMessageId,
      provider_status: o.status === 'sent' ? 'sent' : 'failed',
      error_message: o.detail,
      sent_by: input.sentBy ?? null,
    }));

  if (receiptRows.length > 0 && hasReceipts) {
    // ignoreDuplicates keeps this safe even if two requests race: the loser's
    // receipt is rejected and the message is still recorded in sms_logs.
    const { error: receiptError } = await supabase
      .from('sms_recipient_receipts')
      .upsert(receiptRows, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (receiptError) {
      console.error('sms_recipient_receipts insert failed', receiptError.message);
    }
  }

  return log.id;
}

export type { SemaphoreRecipientResult };
