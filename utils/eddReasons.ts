import { validDate } from '@/utils/calendar';
import { eddFromLmp } from '@/utils/maternalForm';

export const EDD_OVERRIDE_REASONS = [
  { code: 'ultrasound_1st', label: '1st Trimester Ultrasound discrepancy (> 5-7 days)' },
  { code: 'ultrasound_2nd', label: '2nd Trimester Ultrasound discrepancy (> 10-14 days)' },
  { code: 'irregular_lmp', label: 'Irregular / Unknown LMP' },
  { code: 'obgyn_reassessment', label: 'Clinical reassessment by OB-GYN' },
  { code: 'data_correction', label: 'Data entry correction' },
] as const;

export type EddOverrideReason = (typeof EDD_OVERRIDE_REASONS)[number]['code'];

export function isEddOverrideReason(value: unknown): value is EddOverrideReason {
  return typeof value === 'string' && EDD_OVERRIDE_REASONS.some((reason) => reason.code === value);
}

export function eddOverrideLabel(code: unknown): string | null {
  if (!isEddOverrideReason(code)) return null;
  return EDD_OVERRIDE_REASONS.find((reason) => reason.code === code)?.label ?? null;
}

/* True when the stored EDC differs from the LMP-derived date, or LMP is missing. */
export function eddNeedsReason(lmp: unknown, edd: unknown): boolean {
  if (!validDate(edd)) return false;
  if (!validDate(lmp)) return true;
  return eddFromLmp(lmp) !== edd;
}
