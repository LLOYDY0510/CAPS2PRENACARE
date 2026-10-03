import ScheduleSetter, { type ScheduleRow } from '@/components/schedule/ScheduleSetter';
import { requireRoles } from '@/utils/auth/roles';
import { canManageSchedules } from '@/utils/auth/permissions';
import {
  getSmsStatusSummary,
  tryListMothersForScheduling,
  tryListSchedules,
} from '@/utils/schedules/service';

export const dynamic = 'force-dynamic';

export default async function PrenatalSchedulePage() {
  const { role, profile } = await requireRoles(['admin', 'bhw_head', 'bhw_purok', 'nurse']);

  const canEditSchedule = canManageSchedules(role);

  // The schedule service uses the service-role client: the reminder receipts a
  // manager needs to see are written by the server-side sender, and a schedule
  // the manager cannot see is worse than a schedule they can.
  //
  // These reads must never crash the route (e.g. when the service key in the
  // server .env is wrong or stale and Supabase answers "Invalid API key").
  // The safe variants log one clear message each and let the page render an
  // error state instead.
  const [schedulesResult, mothersResult] = await Promise.all([
    tryListSchedules(),
    tryListMothersForScheduling(),
  ]);

  const loadError = !schedulesResult.ok
    ? schedulesResult.error
    : !mothersResult.ok
      ? mothersResult.error
      : null;
  const schedules = (schedulesResult.ok ? schedulesResult.data : []) as ScheduleRow[];
  const mothers = mothersResult.ok ? mothersResult.data : [];

  const smsStatus = await getSmsStatusSummary().catch(() => ({
    account: { creditBalance: null, accountName: null, status: null },
    accountError: 'The SMS provider status could not be read right now.',
    dueSchedules: 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Prenatal Schedule</h1>
      <p className="text-muted mb-6">
        {canEditSchedule
          ? 'Create and change prenatal visits, and send the reminder SMS immediately or let it go out automatically the day before.'
          : 'View the prenatal schedules for your purok.'}
      </p>

      {loadError && (
        <div className="alert-error mb-6" role="alert">
          <p className="font-semibold">The prenatal schedules could not be loaded.</p>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      <ScheduleSetter
        schedules={schedules}
        mothers={mothers}
        canEdit={canEditSchedule}
        role={role}
        userPurok={profile?.purok}
        smsStatus={smsStatus}
      />
    </div>
  );
}
