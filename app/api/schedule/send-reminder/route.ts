import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { canManageSchedules, canSendSMS } from '@/utils/auth/permissions';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendSmsAndLog } from '@/utils/sms/sendSms';
import { estimateCredits, prenatalReminderMessage, prenatalReminderMessageToday } from '@/utils/sms/templates';
import { toE164 } from '@/utils/sms/phone';
import { manilaToday } from '@/utils/sms/clock';
import { recordReminderHistory } from '@/utils/checkPrenatalReminders';

export const dynamic = 'force-dynamic';

/**
 * Sends the reminder for a schedule immediately, to real phone numbers, through
 * the live Semaphore account.
 *
 * Duplicate protection is database-enforced: a mother who already received
 * this schedule's manual reminder today is reported as skipped, not re-sent.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, purok')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role ?? 'pending';

    if (!canSendSMS(role)) {
      return NextResponse.json({ error: 'You are not authorized to send SMS.' }, { status: 403 });
    }
    // A BHW (purok) may text the mothers she is responsible for, but only a
    // schedule manager can press the schedule's own reminder button.
    if (!canManageSchedules(role)) {
      return NextResponse.json(
        { error: 'Only the BHW Manager, nurse, or admin can send schedule reminders.' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const scheduleId = typeof body?.scheduleId === 'string' ? body.scheduleId : null;
    if (!scheduleId) return NextResponse.json({ error: 'scheduleId is required.' }, { status: 400 });

    const admin = createAdminClient();
    const { data: schedule, error: scheduleError } = await admin
      .from('prenatal_schedules')
      .select('id, visit_date, status')
      .eq('id', scheduleId)
      .maybeSingle();

    if (scheduleError) return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    if (!schedule) return NextResponse.json({ error: 'That schedule no longer exists.' }, { status: 404 });
    if (schedule.status !== 'scheduled') {
      return NextResponse.json(
        { error: `This schedule is "${schedule.status}" and can no longer be reminded.` },
        { status: 409 },
      );
    }

    const { data: links } = await admin
      .from('prenatal_schedule_recipients')
      .select('pregnant_mother_id')
      .eq('schedule_id', scheduleId);

    const motherIds = (links ?? []).map((l) => l.pregnant_mother_id as string);
    if (motherIds.length === 0) {
      return NextResponse.json({ error: 'This schedule has no mothers assigned.' }, { status: 400 });
    }

    const requested = Array.isArray(body?.motherIds) ? body.motherIds : null;
    const targets = motherIds
      .filter((id) => (requested ? requested.includes(id) : true))
      .map((id) => ({ pregnantMotherId: id, contactNumber: null as string | null }));
    const ids = targets.map((t) => t.pregnantMotherId as string);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'None of the selected mothers belong to this schedule.' }, { status: 400 });
    }

    const { data: mothers } = await admin
      .from('pregnant_mothers')
      .select('id, full_name, contact_number')
      .in('id', ids);

    const withNumbers = (mothers ?? []).map((m) => ({
      pregnantMotherId: m.id,
      contactNumber: m.contact_number as string | null,
    }));

    const today = manilaToday();
    const text = String(
      body?.message ??
        (schedule.visit_date === today
          ? prenatalReminderMessageToday(schedule.visit_date, body?.timeLabel)
          : prenatalReminderMessage(schedule.visit_date, body?.timeLabel)),
    ).trim();

    if (text.length === 0) return NextResponse.json({ error: 'The message is empty.' }, { status: 400 });
    if (text.length > 480) {
      return NextResponse.json({ error: 'The message is too long for a single SMS.' }, { status: 400 });
    }

    const result = await sendSmsAndLog({
      targets: withNumbers,
      message: text,
      messageType: 'prenatal_reminder',
      sendKind: 'manual',
      scheduleId,
      sentBy: user.id,
      dedupeDay: today,
    });

    // A manual send is an explicit human action, so record it against the
    // schedule's reminder history just like the automatic job would.
    if (result.logId) {
      await recordReminderHistory(admin, scheduleId, result.sent, text, 'manual');
    }

    return NextResponse.json({
      logId: result.logId,
      batchError: result.batchError,
      warnings: result.warnings,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      estimatedCredits: estimateCredits(text, withNumbers.length),
      recipientsWithValidNumbers: withNumbers.filter((m) => toE164(m.contactNumber)).length,
    });
  } catch (error) {
    console.error('send schedule reminder failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send the reminder.' },
      { status: 500 },
    );
  }
}
