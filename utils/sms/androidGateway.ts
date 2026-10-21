import 'server-only';
import { createHash } from 'node:crypto';
import type { SemaphoreSendResult } from './semaphore';
import { readGatewayConfig } from './gatewayConfig';
import type { SmsGatewayConfig } from './gatewayCrypto';

const BASE = 'https://api.sms-gate.app/3rdparty/v1';
let cached: { token: string; expires: number; fingerprint: string } | null = null;

class GatewayAuthenticationError extends Error {
  constructor(message: string, readonly httpStatus: number) {
    super(message);
  }
}

function configurationFingerprint(config: SmsGatewayConfig): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

async function authorization(config: SmsGatewayConfig): Promise<string> {
  if (config.authMode === 'token' && config.token) return `Bearer ${config.token}`;
  if (!config.username || !config.password) throw new GatewayAuthenticationError('SMS Gateway credentials are incomplete.', 400);
  const fingerprint = configurationFingerprint(config);
  if (cached && cached.fingerprint === fingerprint && cached.expires > Date.now() + 60_000) return `Bearer ${cached.token}`;
  let response: Response;
  try {
    response = await fetch(`${BASE}/auth/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 3600, scopes: ['messages:send', 'messages:read'] }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
  } catch {
    throw new GatewayAuthenticationError('SMS Gateway authentication could not be reached. No message was submitted.', 503);
  }
  if (!response.ok) {
    const message = response.status === 401
      ? 'SMS Gateway rejected the Cloud Server username and password. Update them in Configure SMS.'
      : response.status === 403
        ? 'SMS Gateway authentication access was denied (HTTP 403). Check the account permissions.'
        : response.status === 429
          ? 'SMS Gateway received too many authentication requests. Try again later.'
          : response.status >= 500
            ? `SMS Gateway authentication is temporarily unavailable (HTTP ${response.status}). No message was submitted.`
            : `SMS Gateway rejected the authentication request (HTTP ${response.status}). No message was submitted.`;
    throw new GatewayAuthenticationError(message, response.status);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GatewayAuthenticationError('SMS Gateway returned an unreadable authentication response. No message was submitted.', 502);
  }
  if (!data || typeof data !== 'object' || !('access_token' in data) || typeof data.access_token !== 'string' || !data.access_token.trim()) {
    throw new GatewayAuthenticationError('SMS Gateway returned no usable access token. No message was submitted.', 502);
  }
  const expiresAt = 'expires_at' in data && typeof data.expires_at === 'string' ? Date.parse(data.expires_at) : NaN;
  cached = {
    token: data.access_token,
    expires: Math.min(Date.now() + 3_500_000, expiresAt || Date.now() + 3_500_000),
    fingerprint,
  };
  return `Bearer ${cached.token}`;
}

export async function sendGatewayBatch(input: { numbers: string[]; message: string }): Promise<SemaphoreSendResult> {
  const failure = (message: string, httpStatus: number): SemaphoreSendResult => ({ ok: false, httpStatus, raw: null, recipients: [], batchError: message, accepted: false });
  let saved: Awaited<ReturnType<typeof readGatewayConfig>>;
  try {
    saved = await readGatewayConfig();
  } catch {
    return failure('SMS Gateway settings are unavailable. Ask a BHW to review the settings.', 503);
  }
  if (!saved?.config.deviceId) return failure('SMS Gateway is not configured. Ask a BHW to set it up.', 400);
  if (!saved.config.simNumber) return failure('SMS Gateway SIM slot is not configured. Ask a BHW to update the settings.', 400);
  let auth: string;
  try {
    auth = await authorization(saved.config);
  } catch (error) {
    return error instanceof GatewayAuthenticationError
      ? failure(error.message, error.httpStatus)
      : failure('SMS Gateway authentication could not be established. No message was submitted.', 502);
  }
  if (!input.numbers.length) return failure('No valid recipients.', 400);
  let response: Response;
  try {
    response = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textMessage: { text: input.message },
        phoneNumbers: input.numbers,
        deviceId: saved.config.deviceId,
        simNumber: Number(saved.config.simNumber),
        withDeliveryReport: true,
      }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    return failure('Gateway submission outcome is unknown. Reconcile before retrying.', 0);
  }
  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    return failure('Gateway response was unreadable; submission needs review.', response.ok ? 0 : response.status);
  }
  if (!response.ok) {
    if (response.status === 401) cached = null;
    return failure(`SMS Gateway rejected the request (HTTP ${response.status}).`, response.status);
  }
  if (typeof data.id !== 'string') return failure('Gateway returned no message identifier; review submission before retrying.', 0);
  return {
    ok: true,
    httpStatus: response.status,
    raw: { id: data.id, state: data.state, deviceId: saved.config.deviceId },
    batchError: null,
    accepted: true,
    recipients: input.numbers.map(number => ({ number, messageId: String(data.id), status: 'queued', error: null })),
  };
}

export async function gatewayConfigured(): Promise<boolean> {
  try {
    return !!(await readGatewayConfig());
  } catch {
    return false;
  }
}

export async function gatewayStatus() {
  const configured = await gatewayConfigured();
  return {
    accountId: null,
    accountName: 'SMS Gateway Public Cloud',
    configured,
    status: configured ? 'Configured; delivery requires connected phone' : 'Not configured',
    creditBalance: null,
  };
}
