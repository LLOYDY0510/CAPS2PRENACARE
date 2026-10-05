'use client';

/** Client-safe mirror of the server classifySemaphoreError() for fallback text. */
export function friendlySmsError(batchError: string | null | undefined, friendlyError?: string | null): string | null {
  if (friendlyError) return friendlyError;
  if (!batchError) return null;
  const text = batchError.toLowerCase();
  if (text.includes('not configured') || text.includes('semaphore_api_key is missing')) {
    return 'SMS is not configured yet (SEMAPHORE_API_KEY is missing). Add the key and restart the server.';
  }
  if (text.includes('apikey') && (text.includes('invalid') || text.includes('required') || text.includes('incorrect'))) {
    return 'The Semaphore API key was rejected. Copy a fresh key from the Semaphore dashboard and restart the server.';
  }
  if (text.includes('sender') && (text.includes('invalid') || text.includes('no active') || text.includes('not found') || text.includes('registered'))) {
    return 'No approved sender name on this Semaphore account. Apply for one in the Semaphore dashboard and wait for approval.';
  }
  if (text.includes('credit') || text.includes('balance') || text.includes('insufficient') || text.includes('zero balance')) {
    return 'The Semaphore account is out of credits. Top up in the Semaphore dashboard.';
  }
  if (text.includes('number') && (text.includes('invalid') || text.includes('format') || text.includes('not a valid'))) {
    return 'A recipient number was rejected. Confirm it is a Philippine mobile (09XXXXXXXXX).';
  }
  if (text.includes('could not reach semaphore') || text.includes('fetch failed') || text.includes('network')) {
    return 'Could not reach Semaphore (network error). Nothing was charged — retry.';
  }
  return batchError;
}

export function DryRunBadge() {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
      DRY RUN
    </span>
  );
}
