import 'server-only';
import { createAdminClient } from '@/utils/supabase/admin';
import { createRoleNotification } from '@/utils/notifications';
import { manilaDatePlusFor, manilaToday } from '@/utils/sms/clock';
import { getSemaphoreAccount } from '@/utils/sms/semaphore';
import { getSmsSchemaCapabilities } from '@/utils/sms/schema';

export { manilaToday };

export type ScheduleWithRecipients = {
  id: string;
  visit_date: string;
  trimester: string | null;
  status: string;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  notes: string | null;
  set_by: string | null;
  created_at: string;
  updated_at: string | null;
  recipients: {
    pregnant_mother_id: string;
    full_name: string | null;
    contact_number: string | null;
    purok: string | null;
  }[];
};

export type ScheduleInput = {
  visitDate: string;
  trimester: '1st' | '2nd' | '3rd';
  motherIds: string[];
  notes?: string | null;
  setBy: string | null;
  timeLabel?: string | null;
};

export const TRIMESTERS = ['1st', '2nd', '3rd'] as const;
export type Trimester = (typeof TRIMESTERS)[number];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

/** Manila local date, which is the calendar the barangay schedules against. */
export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type SchedulingMother = {
  id: string;
  full_name: string | null;
  purok: string | null;
  contact_number: string | null;
  risk_level: string | null;
};

/**
 * Every mother a schedule can be assigned to.
 *
 * Uses the service-role client deliberately: a BHW (purok) must see her own
 * purok even though her RLS scope is narrower, and the schedule editor filters
 * client-side by the signed-in user's purok.
 */
export async function listMothersForScheduling(): Promise<SchedulingMother[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, purok, contact_number, risk_level')
    .order('full_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SchedulingMother[];
}

export type SmsStatusSummary = {
  account: { creditBalance: number | null; accountName: string | null; status: string | null };
  accountError: string | null;
  dueSchedules: number;
};

/**
 * Live SMS provider status for the schedule page.
 *
 * The balance is read from Semaphore itself rather than from a stored number,
 * so staff see the real remaining credits after a send.
 */
export async function getSmsStatusSummary(): Promise<SmsStatusSummary> {
  let account: SmsStatusSummary['account'] = {
    creditBalance: null,
    accountName: null,
    status: null,
  };
  let accountError: string | null = null;
  try {
    account = await getSemaphoreAccount();
  } catch (error) {
    accountError = error instanceof Error ? error.message : 'Could not reach Semaphore.';
  }

  const supabase = createAdminClient();
  const today = manilaToday();
  const tomorrow = manilaDatePlusFor(1);

  const { count } = await supabase
    .from('prenatal_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .lte('visit_date', tomorrow)
    .gte('visit_date', today);

  return { account, accountError, dueSchedules: count ?? 0 };
}

export async function listSchedules(limit = 25): Promise<ScheduleWithRecipients[]> {
  const supabase = createAdminClient();
  const { hasScheduleNotes, hasUpdatedAt } = await getSmsSchemaCapabilities();
  const { data: schedules, error } = await supabase
    .from('prenatal_schedules')
    .select(
      `id, visit_date, trimester, status, reminder_sent, reminder_sent_at, set_by, created_at${
        hasUpdatedAt ? ', updated_at' : ''
      }${hasScheduleNotes ? ', notes' : ''}`,
    )
    .order('visit_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!schedules?.length) return [];
  // The select string is built at runtime, so PostgREST's generated row type
  // cannot be resolved statically.
  const scheduleRows = schedules as unknown as Array<Omit<ScheduleWithRecipients, 'recipients'>>;

  const { data: links } = await supabase
    .from('prenatal_schedule_recipients')
    .select('schedule_id, pregnant_mother_id')
    .in('schedule_id', scheduleRows.map((s) => s.id));

  const motherIds = Array.from(new Set((links ?? []).map((l) => l.pregnant_mother_id as string)));
  const { data: mothers } = motherIds.length
    ? await supabase
        .from('pregnant_mothers')
        .select('id, full_name, contact_number, purok')
        .in('id', motherIds)
    : { data: [] };

  const motherById = new Map((mothers ?? []).map((m) => [m.id, m]));

  return scheduleRows.map((schedule) => ({
    ...schedule,
    recipients: (links ?? [])
      .filter((l) => l.schedule_id === schedule.id)
      .map((l) => {
        const mother = motherById.get(l.pregnant_mother_id as string);
        return {
          pregnant_mother_id: l.pregnant_mother_id as string,
          full_name: mother?.full_name ?? null,
          contact_number: mother?.contact_number ?? null,
          purok: mother?.purok ?? null,
        };
      }),
  }));
}

export async function createSchedule(input: ScheduleInput): Promise<ServiceResult<ScheduleWithRecipients>> {
  if (!isValidDate(input.visitDate)) return { ok: false, error: 'Visit date is not a valid date.' };
  if (input.visitDate < manilaToday()) return { ok: false, error: 'The visit date cannot be in the past.' };
  if (!TRIMESTERS.includes(input.trimester)) return { ok: false, error: 'Unknown trimester.' };

  const motherIds = Array.from(new Set(input.motherIds));
  if (motherIds.length === 0) return { ok: false, error: 'Select at least one pregnant mother.' };

  const supabase = createAdminClient();

  const { hasScheduleNotes } = await getSmsSchemaCapabilities();

  const { data: schedule, error: insertError } = await supabase
    .from('prenatal_schedules')
    .insert({
      visit_date: input.visitDate,
      trimester: input.trimester,
      set_by: input.setBy,
      ...(hasScheduleNotes ? { notes: input.notes?.trim() || null } : {}),
    })
    .select('id')
    .single();

  if (insertError || !schedule) {
    return { ok: false, error: insertError?.message ?? 'Could not create the schedule.' };
  }

  const { error: linkError } = await supabase.from('prenatal_schedule_recipients').insert(
    motherIds.map((pregnant_mother_id) => ({ schedule_id: schedule.id, pregnant_mother_id })),
  );

  if (linkError) {
    // Do not leave an empty schedule behind - the user would see a visit date
    // with nobody assigned and no way to tell it is broken.
    await supabase.from('prenatal_schedules').delete().eq('id', schedule.id);
    return {
      ok: false,
      error: `Could not assign the mothers, so the schedule was rolled back: ${linkError.message}`,
    };
  }

  await createRoleNotification(supabase, {
    eventKey: `schedule-created:${schedule.id}`,
    category: 'appointment',
    recipientRole: 'nurse',
    title: 'New prenatal schedule',
    message: `A prenatal schedule for ${input.visitDate} was created for ${motherIds.length} pregnant mother(s).`,
  });

  return { ok: true, data: (await getSchedule(schedule.id))! };
}

export async function getSchedule(scheduleId: string): Promise<ScheduleWithRecipients | null> {
  const all = await listSchedules(200);
  return all.find((s) => s.id === scheduleId) ?? null;
}

/**
 * Edits a schedule and invalidates anything already produced for it.
 *
 * The reminder text contains the visit date, so a changed date makes every
 * existing reminder and notification wrong. Rather than leave them to be resent
 * to the wrong day, they are deleted and reminder_sent is reset so the new date
 * gets a fresh, correctly worded reminder.
 */
export async function updateSchedule(
  scheduleId: string,
  input: Partial<ScheduleInput> & { status?: string },
): Promise<ServiceResult<ScheduleWithRecipients>> {
  const supabase = createAdminClient();
  const { hasScheduleNotes, hasAttemptedAt } = await getSmsSchemaCapabilities();

  const { data: existingRow, error: readError } = await supabase
    .from('prenatal_schedules')
    .select(`id, visit_date, trimester, status, reminder_sent${hasScheduleNotes ? ', notes' : ''}`)    .eq('id', scheduleId)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!existingRow) return { ok: false, error: 'That schedule no longer exists.' };
  const existing = existingRow as unknown as { id: string; visit_date: string; trimester: string | null; status: string; reminder_sent: boolean };

  if (input.visitDate !== undefined) {
    if (!isValidDate(input.visitDate)) return { ok: false, error: 'Visit date is not a valid date.' };
    if (input.visitDate < manilaToday()) return { ok: false, error: 'The visit date cannot be in the past.' };
  }
  if (input.trimester !== undefined && !TRIMESTERS.includes(input.trimester)) {
    return { ok: false, error: 'Unknown trimester.' };
  }
  if (input.motherIds !== undefined && new Set(input.motherIds).size === 0) {
    return { ok: false, error: 'A schedule must keep at least one pregnant mother.' };
  }

  const dateChanged = input.visitDate !== undefined && input.visitDate !== existing.visit_date;
  const patch: Record<string, unknown> = {};
  if (input.visitDate !== undefined) patch.visit_date = input.visitDate;
  if (input.trimester !== undefined) patch.trimester = input.trimester;
  if (hasScheduleNotes && input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.status !== undefined) patch.status = input.status;
  // Editing an open schedule re-opens it so the automatic job can run again.
  if (dateChanged) {
    patch.status = input.status ?? 'scheduled';
    patch.reminder_sent = false;
    patch.reminder_sent_at = null;
    // Clear the backoff so the edited date gets a fresh automatic attempt.
    if (hasAttemptedAt) patch.reminder_attempted_at = null;
  }

  const { error: updateError } = await supabase
    .from('prenatal_schedules')
    .update(patch)
    .eq('id', scheduleId);

  if (updateError) return { ok: false, error: updateError.message };

  let recipientsChanged = false;
  if (input.motherIds !== undefined) {
    const motherIds = Array.from(new Set(input.motherIds));
    const { data: current } = await supabase
      .from('prenatal_schedule_recipients')
      .select('pregnant_mother_id')
      .eq('schedule_id', scheduleId);
    const currentIds = new Set((current ?? []).map((r) => r.pregnant_mother_id as string));
    const nextIds = new Set(motherIds);
    recipientsChanged =
      currentIds.size !== nextIds.size || [...nextIds].some((id) => !currentIds.has(id));

    if (recipientsChanged) {
      const toAdd = motherIds.filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

      if (toRemove.length) {
        await supabase
          .from('prenatal_schedule_recipients')
          .delete()
          .eq('schedule_id', scheduleId)
          .in('pregnant_mother_id', toRemove);
      }
      if (toAdd.length) {
        // A plain insert, not an upsert: the rows removed above are exactly the
        // ones that could conflict, so this needs no unique index to be correct
        // and works before migration 014 has been applied.
        const { error: addError } = await supabase
          .from('prenatal_schedule_recipients')
          .insert(toAdd.map((pregnant_mother_id) => ({ schedule_id: scheduleId, pregnant_mother_id })));
        if (addError) return { ok: false, error: `Could not add the new mothers: ${addError.message}` };
      }
    }
  }

  if (dateChanged || recipientsChanged) {
    await invalidateScheduleArtifacts(supabase, scheduleId, {
      dropAutoReceipts: true,
      keepManualHistory: true,
    });
  }

  await createRoleNotification(supabase, {
    eventKey: `schedule-updated:${scheduleId}:${Date.now()}`,
    category: 'appointment',
    recipientRole: 'nurse',
    title: 'Prenatal schedule updated',
    message:
      dateChanged || recipientsChanged
        ? `The schedule for ${patch.visit_date ?? existing.visit_date} was changed. Previous reminders were cleared so the correct one can be sent.`
        : `The schedule for ${existing.visit_date} was updated.`,
  });

  return { ok: true, data: (await getSchedule(scheduleId))! };
}

type InvalidateOptions = {
  dropAutoReceipts?: boolean;
  keepManualHistory?: boolean;
};

/**
 * Clears reminders and notifications produced for a schedule.
 *
 * Manual sends are kept as history by default: a BHW manager who deliberately
 * texted a mother should still see that in the SMS Log.
 */
export async function invalidateScheduleArtifacts(
  supabase: ReturnType<typeof createAdminClient>,
  scheduleId: string,
  options: InvalidateOptions = {},
) {
  const { dropAutoReceipts = true, keepManualHistory = true } = options;

  await supabase.from('prenatal_schedule_reminders').delete().eq('schedule_id', scheduleId);

  const { hasReceipts } = await getSmsSchemaCapabilities();
  if (hasReceipts) {
    await supabase
      .from('sms_recipient_receipts')
      .delete()
      .eq('schedule_id', scheduleId)
      .eq('send_kind', dropAutoReceipts ? 'auto' : '__never__');
  }

  // Two event-key shapes exist: the historical
  // "prenatal-reminder:<schedule>:<mother>" and the current
  // "<message_type>:<log_id>:<mother>". Both are matched with or() - chaining
  // two like() calls on one column would AND them and match nothing.
  await supabase
    .from('maternal_notifications')
    .delete()
    .or(`event_key.like.prenatal-reminder:${scheduleId}:%,event_key.like.prenatal_reminder:${scheduleId}:%`);

  if (!keepManualHistory && hasReceipts) {
    await supabase
      .from('sms_recipient_receipts')
      .delete()
      .eq('schedule_id', scheduleId)
      .eq('send_kind', 'manual');
  }
}

export async function deleteSchedule(scheduleId: string): Promise<ServiceResult<null>> {
  const supabase = createAdminClient();
  await invalidateScheduleArtifacts(supabase, scheduleId, { keepManualHistory: false });
  const { error } = await supabase.from('prenatal_schedules').delete().eq('id', scheduleId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
