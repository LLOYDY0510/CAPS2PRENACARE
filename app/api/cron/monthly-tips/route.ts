import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { collectRows } from '@/utils/supabase/collectRows';
import { sendCurrentMonthTips } from '@/utils/tips/autoTipDispatch';

export const dynamic = 'force-dynamic';

/* Daily scheduler entrypoint (Vercel Cron) for automatic monthly tip SMS. */
function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Send the CRON_SECRET as a Bearer token.' },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data: mothers, error } = await collectRows((start, end) =>
    admin.from('pregnant_mothers').select('id').order('id').range(start, end),
  );
  if (error) return NextResponse.json({ error: 'Mothers could not be loaded for tip dispatch.' }, { status: 500 });

  const report = {
    checked: 0,
    monthsSent: 0,
    notices: 0,
    sms: { total: 0, submitted: 0, failed: 0, invalid: 0, blocked: 0, pending: 0 },
    skipped: {} as Record<string, number>,
    failed: [] as string[],
  };
  for (const mother of mothers ?? []) {
    report.checked++;
    try {
      const result = await sendCurrentMonthTips(mother.id, null);
      if (result.month !== null && result.skipped.length === 0) report.monthsSent++;
      report.notices += result.notices;
      report.sms.total += result.sms.total;
      report.sms.submitted += result.sms.submitted;
      report.sms.failed += result.sms.failed;
      report.sms.invalid += result.sms.invalid;
      report.sms.blocked += result.sms.blocked;
      report.sms.pending += result.sms.pending;
      for (const reason of result.skipped) report.skipped[reason] = (report.skipped[reason] ?? 0) + 1;
    } catch {
      report.failed.push(mother.id);
    }
  }
  return NextResponse.json({ ok: true, ...report });
}
