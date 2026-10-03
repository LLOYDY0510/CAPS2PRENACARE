import ScheduleSetter, { type ScheduleRow } from '@/components/schedule/ScheduleSetter';
import { requireRoles } from '@/utils/auth/roles';
import { canManageSchedules } from '@/utils/auth/permissions';
import { getSmsStatusSummary, listMothersForScheduling, listSchedules } from '@/utils/schedules/service';

export const dynamic = 'force-dynamic';

export default async function PrenatalSchedulePage() {
  const { role, profile } = await requireRoles(['admin', 'bhw_head', 'bhw_purok', 'nurse']);

  const canEditSchedule = canManageSchedules(role);

  // The schedule service uses the service-role client: the reminder receipts a
  // manager needs to see are written by the server-side sender, and a schedule
  // the manager cannot see is worse than a schedule they can.
  const schedules = (await listSchedules()) as ScheduleRow[];
  const mothers = await listMothersForScheduling();
  const smsStatus = await getSmsStatusSummary();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Prenatal Schedule</h1>
      <p className="text-muted mb-6">
        {canEditSchedule
          ? 'Create and change prenatal visits, and send the reminder SMS immediately or let it go out automatically the day before.'
          : 'View the prenatal schedules for your purok.'}
      </p>

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
