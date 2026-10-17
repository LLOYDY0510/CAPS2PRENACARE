import { getPrenatalVisitStatus } from './prenatalStatus';
import { localDate } from './calendar';

export const TRIMESTERS = ['1st', '2nd', '3rd'] as const;
type Trimester = (typeof TRIMESTERS)[number];
type ScheduleRow = {
  trimester: string | null; visit_date: string; status?: string;
  prenatal_schedule_recipients?: { pregnant_mother_id: string }[];
};
export type TrimesterDates = Record<Trimester, string | null>;

export function emptyTrimesterDates(): TrimesterDates {
  return { '1st': null, '2nd': null, '3rd': null };
}

export function scheduleProjection(rows: ScheduleRow[]) {
  const scheduledByMother: Record<string, TrimesterDates> = {};
  const nextVisit: Record<string, string> = {};
  for (const row of rows) {
    if (row.status === 'cancelled' || !TRIMESTERS.includes(row.trimester as Trimester)) continue;
    for (const recipient of row.prenatal_schedule_recipients ?? []) {
      const id = recipient.pregnant_mother_id;
      const dates = scheduledByMother[id] ??= emptyTrimesterDates();
      dates[row.trimester as Trimester] ??= row.visit_date;
      if ((row.status === undefined || row.status === 'scheduled') && row.visit_date >= localDate() &&
        (!nextVisit[id] || row.visit_date < nextVisit[id])) nextVisit[id] = row.visit_date;
    }
  }
  return { scheduledByMother, nextVisit };
}

export function visitStatusFor(checkup: {
  scheduled_checkup_date?: string | null; scheduled_for?: string | null;
  checkup_date?: string | null; actual_checkup_date?: string | null; status?: string;
}) {
  return getPrenatalVisitStatus({
    scheduledFor: checkup.scheduled_checkup_date ?? checkup.scheduled_for ?? checkup.checkup_date,
    actualCheckupDate: checkup.actual_checkup_date, recordedStatus: checkup.status,
  });
}
