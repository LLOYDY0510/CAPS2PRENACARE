import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { hasPermission } from '@/utils/auth/permissions';
import { getSemaphoreAccount, isSmsDryRun } from '@/utils/sms/semaphore';
import { getSmsSchemaCapabilities } from '@/utils/sms/schema';
import { semaphoreNumberFormat } from '@/utils/sms/phone';

/**
 * Admin-only SMS readiness probe.
 *
 * Uses ONLY the free GET /account endpoint — never POST /messages, so it
 * costs no credits and sends no SMS. Reports the config the testing checklist
 * needs. The API key is never returned, masked or otherwise.
 */
export async function GET() {
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
  if (!hasPermission(profile?.role ?? 'pending', 'canManageUsers')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  const keyConfigured = !!process.env.SEMAPHORE_API_KEY?.trim();
  const senderNameSet = !!process.env.SEMAPHORE_SENDER_NAME?.trim();
  const cronSecretSet = !!process.env.CRON_SECRET?.trim();

  let account: { accountId: string | null; accountName: string | null; status: string | null; creditBalance: number | null } = {
    accountId: null,
    accountName: null,
    status: null,
    creditBalance: null,
  };
  let accountError: string | null = null;
  if (keyConfigured) {
    try {
      account = await getSemaphoreAccount();
    } catch (error) {
      accountError = error instanceof Error ? error.message : 'Could not read the Semaphore account.';
    }
  } else {
    accountError = 'SEMAPHORE_API_KEY is missing.';
  }

  let migration014Present = false;
  try {
    migration014Present = (await getSmsSchemaCapabilities()).hasReceipts;
  } catch {
    migration014Present = false;
  }

  return NextResponse.json({
    ok: !accountError && (account.creditBalance ?? 0) > 0,
    dryRun: isSmsDryRun(),
    numberFormat: semaphoreNumberFormat(),
    keyConfigured,
    senderNameSet,
    cronSecretSet,
    migration014Present,
    account: {
      accountName: account.accountName,
      status: account.status,
      creditBalance: account.creditBalance,
    },
    accountError,
  });
}
