import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only privileged client.
 *
 * Accepts SUPABASE_SECRET_KEY (current name) or SUPABASE_SERVICE_ROLE_KEY
 * (older name) so a single env-name difference cannot silently break
 * scheduling, SMS and admin APIs. The `'server-only'` import above fails the
 * build if any client component ever pulls this module in, so the secret key
 * can never ship to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the server environment.',
    );
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Turns a rejected service-key error into the one clear thing to check.
 *
 * PostgREST answers a wrong, expired or rotated secret key with exactly
 * "Invalid API key", which otherwise arrives at each call site as a bare,
 * unactionable message.
 */
export function describeServiceKeyError(error: unknown): string {
  let raw = '';
  if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === 'string') raw = maybe;
  }
  const message = raw || 'Unknown error.';
  return message.includes('Invalid API key')
    ? `${message} — the SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the server .env is not accepted by the Supabase project at NEXT_PUBLIC_SUPABASE_URL. Update it and restart the server.`
    : message;
}

