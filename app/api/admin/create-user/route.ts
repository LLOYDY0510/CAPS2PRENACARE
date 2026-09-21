import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { canManageUsers } from '@/utils/auth/permissions';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Verify requesting user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!canManageUsers(profile?.role)) {
      return NextResponse.json({ error: 'Only admins can create user accounts.' }, { status: 403 });
    }

    const { email, password, full_name, role, purok } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    const validRoles = ['admin', 'nurse', 'bhw_head', 'bhw_purok'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid staff role specified.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Create auth user with pre-confirmed email
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name?.trim() || '' },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create user.' }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 2. Insert or update profile
    const { data: newProfile, error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        email: email.trim().toLowerCase(),
        full_name: full_name?.trim() || null,
        role,
        purok: role === 'bhw_purok' ? purok?.trim() || null : null,
      })
      .select('id, email, full_name, role, purok, created_at')
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}
