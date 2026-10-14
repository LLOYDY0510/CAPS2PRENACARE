/**
 * The single place in the app that talks to Semaphore.
 *
 * Semaphore v4 quirks this module absorbs so no caller has to remember them:
 *   - the API key must be a query parameter (`?apikey=`), not a header;
 *   - a request can succeed with HTTP 200 and still report a per-recipient
 *     failure, so the array body is the source of truth, not the status code;
 *   - the account balance is a separate endpoint and is the only way to prove
 *     real credits were consumed.
 */

const BASE = 'https://api.semaphore.co/api/v4';

export type SemaphoreRecipientResult = {
  /** The number as Semaphore echoed it back. */
  number: string;
  messageId: string | null;
  status: string;
  error: string | null;
};

export type SemaphoreSendResult = {
  ok: boolean;
  httpStatus: number;
  /** Verbatim provider body, stored on sms_logs for auditing. */
  raw: unknown;
  /** Per-recipient results, in the order the numbers were supplied. */
  recipients: SemaphoreRecipientResult[];
  /** Provider-level error (whole batch rejected). */
  batchError: string | null;
  /** True only when the provider accepted the batch. */
  accepted: boolean;
};

export class SemaphoreError extends Error {
  readonly httpStatus: number;
  readonly detail: string;
  constructor(message: string, httpStatus: number, detail = '') {
    super(message);
    this.name = 'SemaphoreError';
    this.httpStatus = httpStatus;
    this.detail = detail;
  }
}

function apiKey(): string {
  const key = process.env.SEMAPHORE_API_KEY?.trim();
  if (!key) {
    throw new SemaphoreError('SMS service is not configured.', 500, 'SEMAPHORE_API_KEY is missing.');
  }
  return key;
}

/** True when SMS_DRY_RUN=true: sendSmsBatch skips the network entirely. */
export function isSmsDryRun(): boolean {
  return process.env.SMS_DRY_RUN?.trim().toLowerCase() === 'true';
}

/** Masks an API key for logs: first 4 + ... + last 2, never the full key. */
export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-2)}`;
}

export type SemaphoreErrorKind =
  | 'invalid_apikey'
  | 'no_sender_name'
  | 'no_credits'
  | 'invalid_number'
  | 'network'
  | 'unconfigured'
  | 'other';

/**
 * Maps provider/config errors to a stable kind plus friendly staff-facing text.
 * The raw provider message is preserved in the result detail / sms_logs row.
 */
export function classifySemaphoreError(message: string | null | undefined): {
  kind: SemaphoreErrorKind;
  friendly: string;
} {
  const text = (message ?? '').toLowerCase();
  if (!text) return { kind: 'other', friendly: 'The SMS provider did not explain the failure. Check the SMS Log for the raw response.' };
  if (text.includes('not configured') || text.includes('semaphore_api_key is missing')) {
    return { kind: 'unconfigured', friendly: 'SMS is not configured yet (SEMAPHORE_API_KEY is missing). Add the key and restart the server.' };
  }
  if (text.includes('apikey') && (text.includes('invalid') || text.includes('required') || text.includes('incorrect'))) {
    return { kind: 'invalid_apikey', friendly: 'The Semaphore API key was rejected. Copy a fresh key from the Semaphore dashboard into SEMAPHORE_API_KEY and restart the server.' };
  }
  if (text.includes('sender') && (text.includes('invalid') || text.includes('no active') || text.includes('not found') || text.includes('registered'))) {
    return { kind: 'no_sender_name', friendly: 'No approved sender name on this Semaphore account. Apply for one in the Semaphore dashboard and wait for approval, then retry without setting SEMAPHORE_SENDER_NAME.' };
  }
  if (text.includes('credit') || text.includes('balance') || text.includes('insufficient') || text.includes('zero balance')) {
    return { kind: 'no_credits', friendly: 'The Semaphore account is out of credits. Top up in the Semaphore dashboard, then check /api/sms/health for the new balance.' };
  }
  if (text.includes('number') && (text.includes('invalid') || text.includes('format') || text.includes('not a valid'))) {
    return { kind: 'invalid_number', friendly: 'A recipient number was rejected by the provider. Confirm it is a Philippine mobile (09XXXXXXXXX) and try SEMAPHORE_NUMBER_FORMAT=63 if the +63 form is refused.' };
  }
  if (text.includes('could not reach semaphore') || text.includes('fetch failed') || text.includes('network')) {
    return { kind: 'network', friendly: 'Could not reach Semaphore (network error). Check connectivity and retry — nothing was charged.' };
  }
  return { kind: 'other', friendly: 'Sending failed. Open the SMS Log entry for the exact provider reason.' };
}

/** Pulls a human-readable message out of Semaphore's several error shapes. */
function extractError(payload: unknown, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) {
    const first = payload[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      const record = first as Record<string, unknown>;
      if (typeof record.error === 'string' && record.error) return record.error;
      if (typeof record.message === 'string' && record.message) return record.message;
      // Semaphore reports account-level problems keyed by the field at fault,
      // e.g. [{ senderName: "No active sender name found. ..." }]. Naming the
      // field is what makes the message actionable.
      for (const value of Object.values(record)) {
        if (typeof value === 'string' && value.trim()) return value;
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
      }
    }
    return fallback;
  }
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message) return record.message;
    // e.g. { "apikey": ["The apikey field is required."] }
    const firstKey = Object.keys(record)[0];
    if (firstKey) {
      const value = record[firstKey];
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
      if (typeof value === 'string') return value;
    }
  }
  return fallback;
}

function normaliseRecipients(payload: unknown): SemaphoreRecipientResult[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((entry): SemaphoreRecipientResult[] => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const number =
      (typeof record.to === 'string' && record.to) ||
      (typeof record.number === 'string' && record.number) ||
      '';
    const messageId =
      (typeof record.message_id === 'string' && record.message_id) ||
      (typeof record.messageId === 'string' && record.messageId) ||
      null;
    const status = typeof record.status === 'string' ? record.status : 'unknown';
    const error = typeof record.error === 'string' && record.error ? record.error : null;
    return [{ number, messageId, status, error }];
  });
}

/**
 * Sends one SMS to many numbers in a single provider request.
 *
 * Never throws for a provider-side failure - a rejected batch is a result the
 * caller must be able to log, not an exception. It only throws when the
 * request could not be made at all (network fault or bad configuration).
 */
export async function sendSmsBatch(input: {
  numbers: string[];
  message: string;
  /** Registered sender ID. Omitted unless configured, because Semaphore
   *  rejects the whole batch with "the selected sendername is invalid" when it
   *  is sent a name the account has not registered. */
  senderName?: string | null;
}): Promise<SemaphoreSendResult> {
  const key = apiKey();
  const { numbers, message } = input;

  if (numbers.length === 0) {
    return { ok: false, httpStatus: 0, raw: null, recipients: [], batchError: 'No numbers supplied.', accepted: false };
  }

  // DRY RUN: skip the network entirely (SMS_DRY_RUN=true). No /messages call,
  // no credits touched. The masked payload is logged so the wiring can be
  // verified safely, and a fake success is returned so the normal log path
  // records the attempt as a dry run.
  if (isSmsDryRun()) {
    const senderName = input.senderName?.trim() || process.env.SEMAPHORE_SENDER_NAME?.trim() || null;
    console.log(
      `[sms dry-run] skipped POST ${BASE}/messages apikey=${maskApiKey(key)} numbers=${numbers.join(',')} sendername=${senderName ?? '(default)'}`,
    );
    const raw = [{ dry_run: true, numbers, sender_name: senderName ?? '(default)' }];
    return {
      ok: true,
      httpStatus: 0,
      raw,
      recipients: numbers.map((number) => ({ number, messageId: `dry-run-${number}`, status: 'dry_run', error: null })),
      batchError: null,
      accepted: true,
    };
  }

  const format = (process.env.SEMAPHORE_NUMBER_FORMAT?.trim() === '63' ? '63' : 'plus63') as 'plus63' | '63';
  const payloadNumbers = format === '63' ? numbers.map((n) => n.replace(/^\+/, '')) : numbers;
  const body = new URLSearchParams({
    apikey: key,
    number: payloadNumbers.join(','),
    message,
  });
  const senderName = input.senderName?.trim() || process.env.SEMAPHORE_SENDER_NAME?.trim();
  if (senderName) body.set('sendername', senderName.slice(0, 11));

  let response: Response;
  try {
    response = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      httpStatus: 0,
      raw: null,
      recipients: numbers.map((number) => ({ number, messageId: null, status: 'not_sent', error: detail })),
      batchError: `Could not reach Semaphore: ${detail}`,
      accepted: false,
    };
  }

  const rawText = await response.text();
  let payload: unknown = null;
  let parsedAsJson = true;
  try {
    payload = JSON.parse(rawText);
  } catch {
    parsedAsJson = false;
    payload = rawText;
  }

  // Semaphore reports a fully rejected batch as 400 with { field: [msg] } and a
  // partial failure as 200 with per-recipient rows. Both are handled here.
  const recipients = normaliseRecipients(payload);

  if (!response.ok) {
    return {
      ok: false,
      httpStatus: response.status,
      raw: payload,
      recipients: [],
      batchError: extractError(payload, `Semaphore rejected the request (HTTP ${response.status}).`),
      accepted: false,
    };
  }

  if (!parsedAsJson) {
    return {
      ok: false,
      httpStatus: response.status,
      raw: payload,
      recipients: [],
      batchError: rawText || 'Semaphore returned a non-JSON response.',
      accepted: false,
    };
  }

  if (recipients.length === 0) {
    return {
      ok: false,
      httpStatus: response.status,
      raw: payload,
      recipients: [],
      batchError: extractError(payload, 'Semaphore returned an empty response.'),
      accepted: false,
    };
  }

  const anyFailed = recipients.some((r) => r.status === 'failed' || r.error);
  return {
    ok: true,
    httpStatus: response.status,
    raw: payload,
    recipients,
    batchError: null,
    accepted: !anyFailed,
  };
}

export type SemaphoreAccount = {
  accountId: string | null;
  accountName: string | null;
  status: string | null;
  creditBalance: number | null;
};

/**
 * Reads the live credit balance so the UI can prove credits are real.
 *
 * This endpoint rate-limits aggressively (HTTP 429 "Too Many Attempts"), so a
 * balance read is best-effort: it returns nulls instead of throwing, because
 * the balance is informational and must never fail a send.
 */
export async function getSemaphoreAccount(): Promise<SemaphoreAccount> {
  const key = apiKey();
  const response = await fetch(`${BASE}/account?apikey=${encodeURIComponent(key)}`);
  const rawText = await response.text();
  if (!response.ok) {
    if (response.status === 429) {
      return { accountId: null, accountName: null, status: null, creditBalance: null };
    }
    throw new SemaphoreError(extractError(rawText, 'Could not read the Semaphore account.'), response.status, rawText);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new SemaphoreError('Semaphore returned an unreadable account response.', response.status, rawText);
  }
  const record = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown> | undefined;
  if (!record) throw new SemaphoreError('Semaphore returned an empty account response.', response.status, rawText);

  return {
    accountId: typeof record.account_id === 'string' ? record.account_id : null,
    accountName: typeof record.account_name === 'string' ? record.account_name : null,
    status: typeof record.status === 'string' ? record.status : null,
    creditBalance: typeof record.credit_balance === 'number' ? record.credit_balance : null,
  };
}
