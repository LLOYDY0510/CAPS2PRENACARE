import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { STAFF_ROLES } from '@/utils/auth/roles';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Verify requesting user is staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, purok')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !STAFF_ROLES.includes(profile.role as any)) {
      return NextResponse.json({ error: 'Only staff can create follow-ups.' }, { status: 403 });
    }

    const { scheduleId, pregnantMotherId, reason, status, nextContactDate } = await req.json();

    if (!scheduleId || typeof scheduleId !== 'string') {
      return NextResponse.json({ error: 'Schedule ID is required.' }, { status: 400 });
    }
    if (!pregnantMotherId || typeof pregnantMotherId !== 'string') {
      return NextResponse.json({ error: 'Pregnant mother ID is required.' }, { status: 400 });
    }

    // Check purok access for BHW users
    if (profile.role === 'bhw_purok') {
      const { data: mother } = await supabase
        .from('pregnant_mothers')
        .select('purok')
        .eq('id', pregnantMotherId)
        .single();

      if (mother?.purok !== profile.purok) {
        return NextResponse.json({ error: 'You can only create follow-ups for mothers in your purok.' }, { status: 403 });
      }
    }

    // Create follow-up record
    const { data: followUp, error: followUpError } = await supabase
      .from('prenatal_follow_ups')
      .insert({
        schedule_id: scheduleId,
        pregnant_mother_id: pregnantMotherId,
        reason: reason || 'Missed prenatal visit',
        status: status || 'pending',
        next_contact_date: nextContactDate || null,
      })
      .select()
      .single();

    if (followUpError) {
      return NextResponse.json({ error: followUpError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, followUp });
  } catch (err) {
    console.error('Create follow-up error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Verify requesting user is staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, purok')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !STAFF_ROLES.includes(profile.role as any)) {
      return NextResponse.json({ error: 'Only staff can view follow-ups.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const pregnantMotherId = searchParams.get('pregnantMotherId');

    let query = supabase
      .from('prenatal_follow_ups')
      .select(`
        *,
        pregnant_mothers (
          full_name,
          purok,
          risk_level
        ),
        prenatal_schedules (
          visit_date
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by pregnant mother if provided
    if (pregnantMotherId) {
      query = query.eq('pregnant_mother_id', pregnantMotherId);
    }

    // For BHW users, filter by their purok
    if (profile.role === 'bhw_purok') {
      query = query.eq('pregnant_mothers.purok', profile.purok);
    }

    const { data: followUps, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, followUps });
  } catch (err) {
    console.error('Get follow-ups error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Verify requesting user is staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, purok')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !STAFF_ROLES.includes(profile.role as any)) {
      return NextResponse.json({ error: 'Only staff can update follow-ups.' }, { status: 403 });
    }

    const { followUpId, status, smsStatus, nextContactDate } = await req.json();

    if (!followUpId || typeof followUpId !== 'string') {
      return NextResponse.json({ error: 'Follow-up ID is required.' }, { status: 400 });
    }

    // Check purok access for BHW users
    if (profile.role === 'bhw_purok') {
      const { data: followUp } = await supabase
        .from('prenatal_follow_ups')
        .select(`
          pregnant_mothers (
            purok
          )
        `)
        .eq('id', followUpId)
        .single();

      const motherPurok = Array.isArray(followUp?.pregnant_mothers) 
        ? (followUp.pregnant_mothers as any)[0]?.purok 
        : (followUp?.pregnant_mothers as any)?.purok;

      if (motherPurok !== profile.purok) {
        return NextResponse.json({ error: 'You can only update follow-ups for mothers in your purok.' }, { status: 403 });
      }
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (smsStatus) updateData.sms_status = smsStatus;
    if (nextContactDate !== undefined) updateData.next_contact_date = nextContactDate;

    const { data: followUp, error: followUpError } = await supabase
      .from('prenatal_follow_ups')
      .update(updateData)
      .eq('id', followUpId)
      .select()
      .single();

    if (followUpError) {
      return NextResponse.json({ error: followUpError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, followUp });
  } catch (err) {
    console.error('Update follow-up error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}
