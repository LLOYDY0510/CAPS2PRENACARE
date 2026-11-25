import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/utils/auth/api';
import { createAdminClient } from '@/utils/supabase/admin';
import { canManageHealthTips } from '@/utils/auth/permissions';

/* Nurse-only edit for one high-risk advice cell (label + month). */
export async function PATCH(request: NextRequest) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireApiPermission();
  if (auth.error) return auth.error;
  if (!canManageHealthTips(auth.profile?.role)) {
    return NextResponse.json({ error: 'Only authorized care reviewers can edit advice content.' }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as {
    indicatorLabel?: unknown; month?: unknown; content?: unknown;
  } | null;
  const label = typeof body?.indicatorLabel === 'string' ? body.indicatorLabel.trim() : '';
  const month = typeof body?.month === 'number' ? body.month : Number(body?.month);
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!label || label.length > 500 || !Number.isInteger(month) || month < 1 || month > 9) {
    return NextResponse.json({ error: 'Choose a valid advice row and month.' }, { status: 400 });
  }
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: 'Advice text is required (maximum 2000 characters).' }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('indicator_monthly_advice')
    .update({ content })
    .eq('indicator_label', label)
    .eq('month', month)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Advice row not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
