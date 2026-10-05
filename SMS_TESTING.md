# SMS Testing Checklist (Semaphore)

Read this end to end before the first real send. No step costs credits until step 6.

## Before you start

- [ ] **Sender name Active + Default**: Semaphore dashboard → Sender Names → at least one
      **Active** sender marked **Default**. If none, apply and wait for approval (every send
      fails with HTTP 500 "No active sender name found" until then).
- [ ] **API key**: `.env` has `SEMAPHORE_API_KEY=<fresh key from dashboard>` (no quotes/spaces).
      Restart `npm run dev` after editing `.env`.
- [ ] **Migration 014 applied**: paste `supabase/migrations/014_prenatal_schedule_and_sms.sql`
      into the Supabase SQL Editor (adds receipts/dedupe so runs are idempotent).

## Health check (free, no SMS)

- [ ] Log in as **admin** → `GET /api/sms/health` (or open it in the browser).
      Everything green means:
      - `keyConfigured: true`
      - `account.creditBalance > 0` and `account.status` active
      - `senderNameSet` / `cronSecretSet` / `migration014Present` as expected
      - `dryRun: false` for a real test (see below)
- [ ] The endpoint never returns the API key. It only calls the free `/account` route.

## Dry run (still no SMS, no credits)

- [ ] Set `SMS_DRY_RUN=true` in `.env`, restart.
- [ ] Press **Send Reminder Now** (or quick-send from SMS Log).
      Expected: a **DRY RUN** badge, notice text "DRY RUN — no SMS left the server.",
      server log line `[sms dry-run] skipped POST ... apikey=xxxx...xx` (masked), and an
      `sms_logs` row whose receipts say `dry_run`.

## One real send

- [ ] Set `SMS_DRY_RUN=false` (or remove it), restart. Put **your own number** on one mother.
- [ ] Send a single reminder. Confirm it arrives on your phone.
- [ ] Open **SMS Log**: the row shows `success`, per-recipient receipt `sent`, and the
      balance in the status banner dropped by the expected credits.

## Reading failures (SMS Log error meanings)

| Error text | Meaning / fix |
| --- | --- |
| `SEMAPHORE_API_KEY is missing` | Env var absent → add key, restart. |
| `The apikey field is invalid / required` | Wrong or truncated key → copy fresh key from dashboard. |
| `No active sender name found...` | No approved/default sender → dashboard → Sender Names. |
| `credit / balance / insufficient` | Out of credits → top up, re-check `/api/sms/health`. |
| `invalid number / number format` | Bad recipient → check 09XXXXXXXXX; try `SEMAPHORE_NUMBER_FORMAT=63`. |
| `Could not reach Semaphore` | Network fault — nothing charged, retry. |

Raw provider bodies are always kept in `sms_logs.semaphore_response`; the readable reason
is in `error_message`. The UI shows the friendly version of the same failure.

## Finish

- [ ] Remove `SMS_DRY_RUN` (or set `false`) and restart — real sends must not run in dry mode.
- [ ] Merge `feature/sms-test-readiness` after review.
