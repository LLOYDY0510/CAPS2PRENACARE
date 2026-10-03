import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { canManageRoles } from '@/utils/auth/permissions';
import { USER_ROLES } from '@/utils/auth/roles';

type RoleUpdateBody = {
  userId?: unknown;
  role?: unknown;
  purok?: unknown;
  pregnantMotherId?: unknown;
  fullName?: unknown;
};

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

    if (!canManageRoles(profile?.role)) {
      return NextResponse.json({ error: 'Only admins can change user accounts.' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as RoleUpdateBody;
    const { userId, role, purok, pregnantMotherId, fullName } = body;

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'A user ID is required.' }, { status: 400 });
    }

    // An admin must not be able to lock themselves out or escalate themselves.
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role or assignment.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id, role, purok, pregnant_mother_id')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
    }

    const updatePayload: Record<string, string | null> = {};

    if (role !== undefined) {
      if (typeof role !== 'string' || !USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
        return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
      }
      if (role === 'pregnant_mother' && typeof pregnantMotherId !== 'string' && !target.pregnant_mother_id) {
        return NextResponse.json(
          { error: 'A pregnant mother record is required for this role.' },
          { status: 400 }
        );
      }
      updatePayload.role = role;
    }

    if (pregnantMotherId !== undefined) {
      if (pregnantMotherId !== null && typeof pregnantMotherId !== 'string') {
        return NextResponse.json({ error: 'Invalid pregnant mother record.' }, { status: 400 });
      }
      if (typeof pregnantMotherId === 'string' && pregnantMotherId) {
        const { data: mother } = await adminClient
          .from('pregnant_mothers')
          .select('id')
          .eq('id', pregnantMotherId)
          .maybeSingle();
        if (!mother) {
          return NextResponse.json({ error: 'That pregnant mother record does not exist.' }, { status: 400 });
        }
        const { data: linkedTo } = await adminClient
          .from('profiles')
          .select('id')
          .eq('pregnant_mother_id', pregnantMotherId)
          .neq('id', userId)
          .maybeSingle();
        if (linkedTo) {
          return NextResponse.json(
            { error: 'That record is already linked to another account.' },
            { status: 400 }
          );
        }
      }
      updatePayload.pregnant_mother_id = (pregnantMotherId as string | null) ?? null;
    }

    if (purok !== undefined) {
      if (purok !== null && typeof purok !== 'string') {
        return NextResponse.json({ error: 'Invalid purok.' }, { status: 400 });
      }
      const trimmed = typeof purok === 'string' ? purok.trim() : '';
      if (trimmed.length > 32) {
        return NextResponse.json({ error: 'Purok value is too long.' }, { status: 400 });
      }
      updatePayload.purok = trimmed || null;
    }

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || !fullName.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      if (fullName.trim().length > 120) {
        return NextResponse.json({ error: 'Name is too long.' }, { status: 400 });
      }
      updatePayload.full_name = fullName.trim();
    }

    // A BHW purok is meaningless without a purok, and other roles must not
    // keep a stale purok assignment that would widen their RLS scope.
    const nextRole = (updatePayload.role as string | undefined) ?? target.role;
    const nextPurok =
      'purok' in updatePayload ? (updatePayload.purok as string | null) : target.purok;

    if (nextRole === 'bhw_purok' && !nextPurok) {
      return NextResponse.json(
        { error: 'Assign a purok before making this account a BHW (Purok).' },
        { status: 400 }
      );
    }
    if (nextRole && nextRole !== 'bhw_purok' && !('purok' in updatePayload)) {
      updatePayload.purok = null;
    }
    if (nextRole && nextRole !== 'pregnant_mother' && !('pregnantMotherId' in updatePayload)) {
      updatePayload.pregnant_mother_id = null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, role, purok, pregnant_mother_id, full_name')
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err) {
    console.error('Update role error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}
