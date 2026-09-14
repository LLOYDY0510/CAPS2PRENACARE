import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json() as { notificationId?: string; markAll?: boolean };
  let query = supabase.from('maternal_notifications').update({ read_at: new Date().toISOString() });
  if (body.markAll) {
    query = query.is('read_at', null).or(`recipient_user_id.eq.${user.id}`);
  } else if (body.notificationId) {
    query = query.eq('id', body.notificationId);
  } else {
    return NextResponse.json({ error: 'Notification id or markAll is required.' }, { status: 400 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}