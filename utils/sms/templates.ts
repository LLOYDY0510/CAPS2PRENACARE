/**
 * Message copy for prenatal reminders.
 *
 * Wording is Filipino, matching what the barangay already sends, and is kept in
 * one place so the manual button and the automatic job can never drift apart.
 */

export function prenatalReminderMessage(visitDate: string, timeLabel?: string | null): string {
  const when = timeLabel?.trim() ? ` (${timeLabel.trim()})` : '';
  return `Paalala: Bukas (${visitDate})${when} po ang inyong prenatal checkup sa Barangay Health Center. Mangyaring pumunta sa nakatakdang oras. Salamat!`;
}

export function prenatalReminderMessageToday(visitDate: string, timeLabel?: string | null): string {
  const when = timeLabel?.trim() ? ` (${timeLabel.trim()})` : '';
  return `Paalala: Ngayong araw (${visitDate})${when} po ang inyong prenatal checkup sa Barangay Health Center. Mangyaring pumunta sa nakatakdang oras. Salamat!`;
}

export function missedVisitMessage(visitDate: string): string {
  return `Paalala: Hindi kayo nakadalo sa prenatal visit noong ${visitDate}. Mangyaring makipag-ugnayan sa Barangay Health Center para sa follow-up schedule. Salamat!`;
}

/** Semaphore counts characters; a 10-part message is the common PH plan. */
export function countSmsSegments(message: string): number {
  const length = [...message].length;
  if (length <= 160) return 1;
  return Math.ceil(length / 153);
}

export function estimateCredits(message: string, recipients: number): number {
  return countSmsSegments(message) * recipients;
}
