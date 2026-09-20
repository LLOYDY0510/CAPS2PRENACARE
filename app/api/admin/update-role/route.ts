import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can change user roles.' }, { status: 403 });
    }

    const { userId, role, purok, pregnantMotherId, fullName } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const validRoles = ['pending', 'bhw_head', 'bhw_purok', 'nurse', 'admin', 'pregnant_mother'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (role === 'pregnant_mother' && (!pregnantMotherId || typeof pregnantMotherId !== 'string')) {
      return NextResponse.json({ error: 'A pregnant mother record is required for this role.' }, { status: 400 });
    }

    const updatePayload: Record<string, string | null> = {
      role,
      purok: role === 'bhw_purok' && typeof purok === 'string' ? purok.trim() || null : null,
      pregnant_mother_id: role === 'pregnant_mother' ? pregnantMotherId : null,
    };

    if (typeof fullName === 'string' && fullName.trim()) {
      updatePayload.full_name = fullName;
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update role error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}
