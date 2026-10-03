import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { canManageSchedules } from '@/utils/auth/permissions';
import { deleteSchedule, updateSchedule, type Trimester } from '@/utils/schedules/service';

export const dynamic = 'force-dynamic';

async function requireScheduleManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!canManageSchedules(profile?.role ?? 'pending')) {
    return {
      error: NextResponse.json(
        { error: 'Only the BHW Manager, nurse, or admin can change prenatal schedules.' },
        { status: 403 },
      ),
    };
  }
  return { supabase, user };
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireScheduleManager();
    if (auth.error) return auth.error;

    const body = await req.json();
    const scheduleId = typeof body?.scheduleId === 'string' ? body.scheduleId : null;
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId is required.' }, { status: 400 });
    }

    const patch: Parameters<typeof updateSchedule>[1] = {};
    if (body.visitDate !== undefined) patch.visitDate = String(body.visitDate);
    if (body.trimester !== undefined) patch.trimester = body.trimester as Trimester;
    if (body.notes !== undefined) patch.notes = typeof body.notes === 'string' ? body.notes : null;
    if (body.status !== undefined) patch.status = String(body.status);
    if (body.motherIds !== undefined) {
      if (!Array.isArray(body.motherIds)) {
        return NextResponse.json({ error: 'motherIds must be a list.' }, { status: 400 });
      }
      patch.motherIds = body.motherIds.filter((v: unknown): v is string => typeof v === 'string');
    }

    const result = await updateSchedule(scheduleId, patch);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ schedule: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update the schedule.' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireScheduleManager();
    if (auth.error) return auth.error;

    const scheduleId = req.nextUrl.searchParams.get('scheduleId');
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId is required.' }, { status: 400 });
    }

    const result = await deleteSchedule(scheduleId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete the schedule.' },
      { status: 500 },
    );
  }
}
