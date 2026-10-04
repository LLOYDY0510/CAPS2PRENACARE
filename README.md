This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Prenatal Schedule & SMS

### Required environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SEMAPHORE_API_KEY` | yes | Sending. Also used to read the live credit balance. |
| `SEMAPHORE_SENDER_NAME` | no | A sender ID **registered and approved in your Semaphore account**. Omitted by default; sending an unregistered name makes Semaphore reject the entire batch. |
| `CRON_SECRET` | for cron | Bearer token required by `GET /api/cron/prenatal-reminders`. The endpoint refuses every request while this is unset. |
| `NEXT_PUBLIC_OAUTH_PROVIDERS` | no | Comma-separated Supabase OAuth providers enabled on the login screen (e.g. `google,github`). When unset, every social button renders disabled. |

### Semaphore account must have an approved sender name

Semaphore rejects **all** messages with HTTP 500 and
`"No active sender name found. Please apply for a sender name before sending messages."`
until a sender name has been applied for and approved on the account. This is an
account-level setting in the Semaphore dashboard, not something the app can set.
Check it before expecting delivery:

```bash
curl "https://api.semaphore.co/api/v4/account?apikey=$SEMAPHORE_API_KEY"
```

### Phone numbers must be sent in international format

Numbers are stored locally (`09389201440`) because that is what staff type.
`utils/sms/phone.ts` converts them to `+639389201440` before sending; sending
the stored value directly is rejected by the provider.

### Database migration

`supabase/migrations/014_prenatal_schedule_and_sms.sql` must be pasted into the
Supabase SQL Editor. It adds:

- `sms_recipient_receipts` — one row per recipient holding the real Semaphore
  result, with a **unique `dedupe_key`** that is what actually prevents a mother
  being texted the same reminder twice;
- `prenatal_schedules.notes`, `.updated_at`, `.reminder_attempted_at`;
- unique keys on `prenatal_schedule_recipients` and `prenatal_schedule_reminders`.

Until it is applied the app still sends and still logs to `sms_logs`, but
duplicate protection is inactive and the Prenatal Schedule page shows that
warning. `utils/sms/schema.ts` probes for the new objects once per process.

### Running the daily reminder

The automatic "one day before" reminder runs when a staff member opens the
dashboard. For a guarantee, point an external scheduler at:

```
GET /api/cron/prenatal-reminders
Authorization: Bearer $CRON_SECRET
```

The job is idempotent: `reminder_sent` is only set when a message actually left,
and a failed attempt backs off for an hour so a misconfigured provider cannot
write a new failure row on every page view.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
