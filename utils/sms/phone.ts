/**
 * Philippine mobile number normalisation for SMS providers.
 *
 * Numbers are stored locally ("09389201440") because that is what the barangay
 * staff type, but Semaphore only accepts international format. Sending the
 * stored value straight through is why no reminder was ever delivered.
 */

const PH_MOBILE = /^9\d{9}$/;

export function toE164(input: string | null | undefined): string | null {
  if (!input) return null;

  let digits = String(input).replace(/[^0-9]/g, '');

  // Trim a leading 00 international prefix.
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Already international: 63 + 9XXXXXXXXX
  if (digits.startsWith('63') && digits.length === 12) {
    return `+${digits}`;
  }

  // Local: 09XXXXXXXXX (11 digits)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (PH_MOBILE.test(digits)) {
    return `+63${digits}`;
  }

  return null;
}

export function isValidMobileNumber(input: string | null | undefined): boolean {
  return toE164(input) !== null;
}

/**
 * Formats a number for the Semaphore API as 639XXXXXXXXXX (no leading +).
 *
 * Semaphore's documented examples use 09.../639... without a plus sign, so
 * this strips the + that toE164() adds. toE164() stays the canonical form
 * for UI display (formatE164) and DB matching; use this only at the provider
 * boundary.
 */
export function toSemaphoreFormat(input: string | null | undefined): string | null {
  const e164 = toE164(input);
  if (!e164) return null;
  return e164.replace(/^\+/, '');
}

/** Renders a number for the UI, e.g. +63 938 920 1440. */
export function formatE164(e164: string | null | undefined): string {
  if (!e164) return '—';
  const digits = e164.replace(/[^\d]/g, '');
  if (digits.length !== 12 || !digits.startsWith('63')) return e164;
  return `+63 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}
