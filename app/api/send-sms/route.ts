import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { canSendSMS } from '@/utils/auth/permissions';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendSmsAndLog, type SmsMessageType } from '@/utils/sms/sendSms';
import { toE164 } from '@/utils/sms/phone';

const MESSAGE_TYPES: SmsMessageType[] = [
  'general',
  'prenatal_reminder',
  'missed_visit_follow_up',
  'risk_alert',
  'health_tip',
  'nutrition_tip',
  'care_message',
];

/**
 * Staff-initiated SMS (the SMS Log quick-send and any ad-hoc message).
 *
 * Delegates to the shared sender so this path records the provider's real
 * per-recipient answer in sms_recipient_receipts exactly like the schedule
 * reminders do, and refuses a repeat send to the same mother on the same day.
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
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!canSendSMS(profile?.role ?? 'pending')) {
      return NextResponse.json({ error: 'You are not authorized to send SMS.' }, { status: 403 });
    }

    const body = await req.json();
    const { numbers, message, pregnantMotherIds, messageType = 'care_message' } = body ?? {};

    if (!MESSAGE_TYPES.includes(messageType)) {
      return NextResponse.json({ error: 'Invalid message type.' }, { status: 400 });
    }
    if (!Array.isArray(numbers) || numbers.length === 0 || numbers.length > 100) {
      return NextResponse.json({ error: 'No recipient numbers provided.' }, { status: 400 });
    }
    if (typeof message !== 'string' || !message.trim() || message.length > 480) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const usable = numbers
      .filter((n: unknown): n is string => typeof n === 'string')
      .map((n) => toE164(n))
      .filter((n): n is string => n !== null);
    if (usable.length === 0) {
      return NextResponse.json(
        { error: 'One or more recipient numbers are invalid.' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const motherIds = Array.isArray(pregnantMotherIds)
      ? pregnantMotherIds.filter((v: unknown): v is string => typeof v === 'string')
      : [];

    // Pair each number with its mother so the receipt is attributable.
    let mothers: { id: string; contact_number: string | null }[] = [];
    if (motherIds.length) {
      const { data } = await admin
        .from('pregnant_mothers')
        .select('id, contact_number')
        .in('id', motherIds);
      mothers = data ?? [];
    }

    const targets = usable.map((phone) => {
      const match = mothers.find(
        (m) => toE164(m.contact_number) === phone,
      );
      return { pregnantMotherId: match?.id ?? null, contactNumber: phone };
    });

    const result = await sendSmsAndLog({
      targets,
      message: message.trim(),
      messageType: messageType as SmsMessageType,
      sendKind: 'manual',
      scheduleId: null,
      sentBy: user.id,
    });

    if (result.sent.length === 0 && result.failed.length === 0) {
      return NextResponse.json(
        { error: result.batchError ?? 'Nothing was sent.' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: result.sent.length > 0,
      logId: result.logId,
      batchError: result.batchError,
      friendlyError: result.friendlyError,
      errorKind: result.errorKind,
      dryRun: result.dryRun,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (err) {
    console.error('SMS send error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong sending the SMS.' },
      { status: 500 },
    );
  }
}
