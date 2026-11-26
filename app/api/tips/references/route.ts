import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/utils/auth/api';
import { createAdminClient } from '@/utils/supabase/admin';
import { canManageHealthTips } from '@/utils/auth/permissions';

/* Nurse-only edit for one tip reference citation. */
export async function PATCH(request: NextRequest) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireApiPermission();
  if (auth.error) return auth.error;
  if (!canManageHealthTips(auth.profile?.role)) {
    return NextResponse.json({ error: 'Only authorized care reviewers can edit references.' }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { position?: unknown; citation?: unknown } | null;
  const position = typeof body?.position === 'number' ? body.position : Number(body?.position);
  const citation = typeof body?.citation === 'string' ? body.citation.trim() : '';
  if (!Number.isInteger(position) || position < 1) {
    return NextResponse.json({ error: 'Choose a valid reference.' }, { status: 400 });
  }
  if (!citation || citation.length > 2000) {
    return NextResponse.json({ error: 'Citation text is required (maximum 2000 characters).' }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tip_references')
    .update({ citation })
    .eq('position', position)
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Reference not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
