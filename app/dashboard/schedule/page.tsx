import ScheduleSetter, { type ScheduleRow } from '@/components/schedule/ScheduleSetter';
import { requireRoles } from '@/utils/auth/roles';
import { canManageSchedules } from '@/utils/auth/permissions';
import {
  getSmsStatusSummary,
  tryListMothersForScheduling,
  tryListSchedules,
} from '@/utils/schedules/service';
import PageHeader from '@/components/ui/PageHeader';
import { CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PrenatalSchedulePage() {
  const { role, profile } = await requireRoles(['admin', 'bhw_head', 'bhw_purok', 'nurse']);

  const canEditSchedule = canManageSchedules(role);

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
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        title="Prenatal Schedule"
        subtitle={
          canEditSchedule
            ? 'Create and manage prenatal visits, dispatch instant SMS reminders, or rely on automated dispatch'
            : 'View scheduled prenatal visits for your assigned purok'
        }
        icon={CalendarDays}
        badge="Appointment Management"
      />

      {loadError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold" role="alert">
          <p className="font-bold">The prenatal schedules could not be loaded.</p>
          <p className="text-xs mt-0.5">{loadError}</p>
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
