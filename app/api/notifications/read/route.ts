import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isUserRole, isStaffRole } from '@/utils/auth/roles';

/**
 * Marks one notification, or every unread notification, as read.
 * The update is issued with the caller's own session so the
 * maternal_notifications RLS policy is the enforcement boundary; the filters
 * below only narrow the target set.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, purok, pregnant_mother_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !isUserRole(profile.role)) {
    return NextResponse.json({ error: 'Your account has no valid role.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    notificationId?: unknown;
    markAll?: unknown;
  };

  if (body.markAll !== true && typeof body.notificationId !== 'string') {
    return NextResponse.json(
      { error: 'A notification id, or markAll: true, is required.' },
      { status: 400 }
    );
  }

  const filters = [`recipient_user_id.eq.${user.id}`];
  if (isStaffRole(profile.role)) {
    filters.push('recipient_role.is.null');
    filters.push(`recipient_role.eq.${profile.role}`);
    if (profile.role === 'bhw_purok' && profile.purok) {
      filters.push(`recipient_purok.eq.${profile.purok}`);
    }
  }
  if (profile.role === 'pregnant_mother' && profile.pregnant_mother_id) {
    // A mother may only ever mark the notifications on her own record; she is
    // never matched by recipient_role, which could reach other patients.
    filters.length = 0;
    filters.push(`pregnant_mother_id.eq.${profile.pregnant_mother_id}`);
  } else if (profile.role === 'pregnant_mother') {
    return NextResponse.json({ error: 'Your account is not linked to a record.' }, { status: 403 });
  }

  let query = supabase
    .from('maternal_notifications')
    .update({ read_at: new Date().toISOString() })
    .select('id');

  if (body.markAll === true) {
    query = query.is('read_at', null);
  } else {
    query = query.eq('id', body.notificationId as string);
  }

  const { data, error } = await query.or(filters.join(','));

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, updated: data?.length ?? 0 });
}
