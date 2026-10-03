/**
 * Calendar helpers pinned to Asia/Manila.
 *
 * The server may run in UTC, but a prenatal visit is a local appointment: a
 * schedule set for "tomorrow" in the barangay must resolve to the same date
 * whether the request is served at 00:30 or 23:30 local time.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** YYYY-MM-DD for a Manila calendar day `days` away from today. */
export function manilaDatePlusFor(days: number): string {
  const shifted = new Date(Date.now() + MANILA_OFFSET_MS);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function manilaToday(): string {
  return manilaDatePlusFor(0);
}

export function manilaTomorrow(): string {
  return manilaDatePlusFor(1);
}

/** 0 = Sunday. Used to show a visit's weekday next to its date. */
export function weekdayLabel(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-PH', { timeZone: 'UTC', weekday: 'long' });
}

/** "in 3 days" / "today" / "2 days ago", relative to Manila. */
export function relativeDayLabel(dateString: string): string {
  const target = new Date(`${dateString}T00:00:00Z`).getTime();
  const today = new Date(`${manilaToday()}T00:00:00Z`).getTime();
  const diff = Math.round((target - today) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  return diff > 0 ? `in ${diff} days` : `${Math.abs(diff)} days ago`;
}
