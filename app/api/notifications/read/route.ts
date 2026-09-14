import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, purok, pregnant_mother_id').eq('id', user.id).maybeSingle();

  const body = await request.json() as { notificationId?: string; markAll?: boolean };
  let query = supabase.from('maternal_notifications').update({ read_at: new Date().toISOString() });
  if (body.markAll) {
    const filters = [`recipient_user_id.eq.${user.id}`];
    if (profile?.role) filters.push(`recipient_role.eq.${profile.role}`);
    if (profile?.role === 'bhw_purok' && profile.purok) filters.push(`recipient_purok.eq.${profile.purok}`);
    if (profile?.role === 'pregnant_mother' && profile.pregnant_mother_id) filters.push(`pregnant_mother_id.eq.${profile.pregnant_mother_id}`);
    query = query.is('read_at', null).or(filters.join(','));
  } else if (body.notificationId) {
    query = query.eq('id', body.notificationId);
  } else {
    return NextResponse.json({ error: 'Notification id or markAll is required.' }, { status: 400 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}