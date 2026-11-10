/**
 * Bisaya message copy for maternal SMS, with per-recipient tokens.
 *
 * [Ngalan] is the mother's name and [Petsa] is the visit date. Templates
 * keep the tokens; the server resolves them per recipient in
 * personalizeSmsMessage so staff never type names or dates by hand.
 */

export const SMS_NAME_TOKEN = '[Ngalan]';
export const SMS_DATE_TOKEN = '[Petsa]';
const FALLBACK_NAME = 'Nanay';

export type SmsPersonalization = {
  name?: string | null;
  date?: string | null;
};

/* Resolve tokens for one recipient. Pure and safe to run anywhere. */
export function personalizeSmsMessage(template: string, values: SmsPersonalization = {}): string {
  const name = values.name?.trim() || FALLBACK_NAME;
  const date = values.date?.trim() || SMS_DATE_TOKEN;
  return template.split(SMS_NAME_TOKEN).join(name).split(SMS_DATE_TOKEN).join(date);
}

export function smsTemplateHasTokens(template: string): boolean {
  return template.includes(SMS_NAME_TOKEN) || template.includes(SMS_DATE_TOKEN);
}

/* Builders keep [Ngalan] when no name is given so the send path can resolve it. */
function fillTemplate(template: string, visitDate: string, name?: string | null): string {
  const who = name?.trim() || SMS_NAME_TOKEN;
  return template.split(SMS_NAME_TOKEN).join(who).split(SMS_DATE_TOKEN).join(visitDate);
}

export function prenatalReminderMessage(visitDate: string, timeLabel?: string | null, name?: string | null): string {
  const when = timeLabel?.trim() ? ` (${timeLabel.trim()})` : '';
  return fillTemplate(
    `Pahinumdom ${SMS_NAME_TOKEN}: ugma (${SMS_DATE_TOKEN})${when} ang imong prenatal checkup sa Barangay Health Center. Palihug adto sa sakto nga oras. Salamat!`,
    visitDate, name,
  );
}

export function prenatalReminderMessageToday(visitDate: string, timeLabel?: string | null, name?: string | null): string {
  const when = timeLabel?.trim() ? ` (${timeLabel.trim()})` : '';
  return fillTemplate(
    `Pahinumdom ${SMS_NAME_TOKEN}: karong adlawa (${SMS_DATE_TOKEN})${when} ang imong prenatal checkup sa Barangay Health Center. Palihug adto sa sakto nga oras. Salamat!`,
    visitDate, name,
  );
}

const VISIT_ORDINALS = ['1st', '2nd', '3rd'];

/* Booking confirmation for a newly saved schedule. Migration 036 builds this same text in SQL. */
export function scheduleConfirmationMessage(visitDate: string, trimester: string, visitNumber: number, name?: string | null): string {
  const visit = `${VISIT_ORDINALS[visitNumber - 1] ?? `${visitNumber}th`} Visit`;
  return fillTemplate(
    `Nakatakda ang imong prenatal checkup, ${SMS_NAME_TOKEN}: ${SMS_DATE_TOKEN} sa Barangay Health Center (${trimester} Trimester, ${visit}). Palihug adto sa sakto nga adlaw. Salamat!`,
    visitDate, name,
  );
}

export function missedVisitMessage(visitDate: string, name?: string | null): string {
  return fillTemplate(
    `Pahinumdom ${SMS_NAME_TOKEN}: wala ka nakatambong sa prenatal visit niadtong ${SMS_DATE_TOKEN}. Palihug kontaka ang Barangay Health Center para sa follow-up. Salamat!`,
    visitDate, name,
  );
}

/* Registration SMS with the auto-generated serial. Queue trigger mirrors this in SQL. */
export function registrationMessage(serialNo: string, name?: string | null): string {
  const who = name?.trim() || SMS_NAME_TOKEN;
  return `Narehistro ka na sa maternal care program, ${who}! Ang imong record number kay ${serialNo}. Palihug kontaka ang imong BHW para sa prenatal nga pag-atiman. Salamat!`;
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
