import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { canManageSchedules } from '@/utils/auth/permissions';
import { createSchedule, listSchedules, type Trimester } from '@/utils/schedules/service';

export const dynamic = 'force-dynamic';

async function requireScheduleManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role ?? 'pending';
  if (!canManageSchedules(role)) {
    return {
      error: NextResponse.json(
        { error: 'Only the BHW Manager, nurse, or admin can manage prenatal schedules.' },
        { status: 403 },
      ),
    };
  }
  return { supabase, user, role };
}

function parseMotherIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return Array.from(new Set(ids));
}

export async function GET() {
  try {
    const auth = await requireScheduleManager();
    if (auth.error) return auth.error;
    return NextResponse.json({ schedules: await listSchedules() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load schedules.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireScheduleManager();
    if (auth.error) return auth.error;

    const body = await req.json();
    const motherIds = parseMotherIds(body?.motherIds);
    if (!motherIds) {
      return NextResponse.json({ error: 'A list of pregnant mothers is required.' }, { status: 400 });
    }

    const result = await createSchedule({
      visitDate: String(body?.visitDate ?? ''),
      trimester: body?.trimester as Trimester,
      motherIds,
      notes: typeof body?.notes === 'string' ? body.notes : null,
      setBy: auth.user.id,
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ schedule: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create the schedule.' },
      { status: 500 },
    );
  }
}
