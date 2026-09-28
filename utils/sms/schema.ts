import 'server-only';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Schema capability probe.
 *
 * Migration 014 adds the storage the new SMS pipeline needs
 * (sms_recipient_receipts, prenatal_schedules.notes,
 * prenatal_schedule_reminders.send_kind). DDL cannot be applied from the app,
 * so until the migration is pasted into the Supabase SQL Editor the database
 * does not have those objects.
 *
 * Rather than break the whole schedule screen, each addition is probed once per
 * process and used only when present. The consequence - duplicate protection
 * being inactive - is reported back to the caller instead of being hidden.
 */
export type SmsSchemaCapabilities = {
  hasReceipts: boolean;
  hasScheduleNotes: boolean;
  hasReminderSendKind: boolean;
  hasAttemptedAt: boolean;
  hasUpdatedAt: boolean;
};

let cached: SmsSchemaCapabilities | null = null;

async function probeColumn(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  column: string,
): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  // PGRST204 = "Could not find the column in the schema cache".
  return !/column|schema cache|PGRST204|does not exist/i.test(error.message);
}

export async function getSmsSchemaCapabilities(): Promise<SmsSchemaCapabilities> {
  if (cached) return cached;

  const supabase = createAdminClient();

  const [
    hasReceipts,
    hasScheduleNotes,
    hasReminderSendKind,
    hasAttemptedAt,
    hasUpdatedAt,
  ] = await Promise.all([
    probeColumn(supabase, 'sms_recipient_receipts', 'dedupe_key'),
    probeColumn(supabase, 'prenatal_schedules', 'notes'),
    probeColumn(supabase, 'prenatal_schedule_reminders', 'send_kind'),
    probeColumn(supabase, 'prenatal_schedules', 'reminder_attempted_at'),
    probeColumn(supabase, 'prenatal_schedules', 'updated_at'),
  ]);

  cached = { hasReceipts, hasScheduleNotes, hasReminderSendKind, hasAttemptedAt, hasUpdatedAt };
  return cached;
}

/** Test seam — lets a verification script exercise both schema states. */
export function resetCapabilityCache() {
  cached = null;
}

export const MIGRATION_014_HINT =
  'Duplicate reminder protection is inactive. Run supabase/migrations/014_prenatal_schedule_and_sms.sql in the Supabase SQL Editor.';
