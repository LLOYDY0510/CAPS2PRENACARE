import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const STAFF_ROLES = ['admin', 'nurse', 'bhw_head', 'bhw_purok'] as const;

async function getAuthorizedStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, purok')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.role || !STAFF_ROLES.includes(profile.role as (typeof STAFF_ROLES)[number])) {
    return { error: NextResponse.json({ error: 'You are not authorized to manage prenatal checkups.' }, { status: 403 }) };
  }

  return { supabase, user, profile };
}

async function canAccessMother(
  motherId: string,
  profile: { role: string; purok: string | null },
) {
  if (profile.role !== 'bhw_purok') return true;

  const adminClient = createAdminClient();
  const { data: mother } = await adminClient
    .from('pregnant_mothers')
    .select('purok')
    .eq('id', motherId)
    .maybeSingle();

  return !!mother && mother.purok === profile.purok;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedStaff();
    if ('error' in auth) return auth.error;

    const body = await request.json() as {
      pregnantMotherId?: unknown;
      trimester?: unknown;
      scheduledCheckupDate?: unknown;
      actualCheckupDate?: unknown;
      bloodPressure?: unknown;
      weightKg?: unknown;
      notes?: unknown;
    };

    if (
      typeof body.pregnantMotherId !== 'string' ||
      !['1st', '2nd', '3rd'].includes(String(body.trimester)) ||
      typeof body.scheduledCheckupDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.scheduledCheckupDate) ||
      (body.actualCheckupDate != null && body.actualCheckupDate !== '' &&
        (typeof body.actualCheckupDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.actualCheckupDate)))
    ) {
      return NextResponse.json({ error: 'Invalid prenatal checkup data.' }, { status: 400 });
    }

    if (!(await canAccessMother(body.pregnantMotherId, auth.profile))) {
      return NextResponse.json({ error: 'You cannot manage records outside your assigned purok.' }, { status: 403 });
    }

    const weight = body.weightKg == null || body.weightKg === '' ? null : Number(body.weightKg);
    if (weight != null && (!Number.isFinite(weight) || weight <= 0 || weight > 300)) {
      return NextResponse.json({ error: 'Weight must be between 0 and 300 kg.' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const actualCheckupDate = typeof body.actualCheckupDate === 'string' && body.actualCheckupDate ? body.actualCheckupDate : null;
    const scheduledCheckupDate = body.scheduledCheckupDate;
    const { data: existing } = await adminClient
      .from('prenatal_checkups')
      .select('id')
      .eq('pregnant_mother_id', body.pregnantMotherId)
      .eq('trimester', body.trimester)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const values = {
      pregnant_mother_id: body.pregnantMotherId,
      trimester: body.trimester,
      scheduled_checkup_date: scheduledCheckupDate,
      actual_checkup_date: actualCheckupDate,
      checkup_date: actualCheckupDate ?? scheduledCheckupDate,
      scheduled_for: scheduledCheckupDate,
      blood_pressure: typeof body.bloodPressure === 'string' && body.bloodPressure.trim() ? body.bloodPressure.trim() : null,
      weight_kg: weight,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      status: actualCheckupDate ? 'completed' : 'scheduled',
      recorded_by: auth.user.id,
    };
    const { data, error } = await adminClient
      .from('prenatal_checkups')
      .upsert(existing ? { id: existing.id, ...values } : values, { onConflict: 'id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save prenatal checkup.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthorizedStaff();
    if ('error' in auth) return auth.error;

    const body = await request.json() as { id?: unknown; pregnantMotherId?: unknown };
    if (typeof body.id !== 'string' || typeof body.pregnantMotherId !== 'string') {
      return NextResponse.json({ error: 'Checkup and mother IDs are required.' }, { status: 400 });
    }

    if (!(await canAccessMother(body.pregnantMotherId, auth.profile))) {
      return NextResponse.json({ error: 'You cannot manage records outside your assigned purok.' }, { status: 403 });
    }

    const { error } = await createAdminClient()
      .from('prenatal_checkups')
      .delete()
      .eq('id', body.id)
      .eq('pregnant_mother_id', body.pregnantMotherId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete prenatal checkup.' }, { status: 500 });
  }
}