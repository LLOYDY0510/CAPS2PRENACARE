'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ScheduleEditor, { type ScheduleEditorValue, type ScheduleMother, type Trimester } from './ScheduleEditor';
import { formatE164, toE164 } from '@/utils/sms/phone';
import { relativeDayLabel, weekdayLabel } from '@/utils/sms/clock';

export type ScheduleRow = {
  id: string;
  visit_date: string;
  trimester: string | null;
  status: string;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  notes: string | null;
  updated_at: string | null;
  recipients: {
    pregnant_mother_id: string;
    full_name: string | null;
    contact_number: string | null;
    purok: string | null;
  }[];
};

type SendOutcome = {
  phone: string | null;
  pregnantMotherId: string | null;
  status: 'sent' | 'failed' | 'skipped_duplicate' | 'skipped_invalid';
  detail: string | null;
  providerMessageId: string | null;
};

type SmsStatus = {
  account: { creditBalance: number | null; accountName: string | null; status: string | null };
  accountError: string | null;
  dueSchedules: number;
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'badge-neutral',
  completed: 'badge-low',
  missed: 'badge-high',
  cancelled: 'badge-neutral',
};

export default function ScheduleSetter({
  schedules,
  mothers,
  canEdit,
  role,
  userPurok,
  smsStatus,
}: {
  schedules: ScheduleRow[];
  mothers: ScheduleMother[];
  canEdit: boolean;
  role: string;
  userPurok?: string | null;
  smsStatus: SmsStatus;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<'idle' | 'create' | { edit: string }>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, SendOutcome[]>>({});

  // A BHW (purok) sees only her own purok.
  const scopedMothers =
    role === 'bhw_purok' && userPurok
      ? mothers.filter((m) => m.purok === userPurok)
      : mothers;

  const upcoming = schedules.filter((s) => s.status === 'scheduled');
  const history = schedules.filter((s) => s.status !== 'scheduled');

  async function handleCreate(value: ScheduleEditorValue) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitDate: value.visitDate,
          trimester: value.trimester,
          notes: value.notes,
          motherIds: value.motherIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Could not create the schedule.');
        return false;
      }
      setMode('idle');
      setNotice('Schedule created. Send the reminder now, or let the daily job send it tomorrow.');
      router.refresh();
      return true;
    } catch {
      setError('Network error while creating the schedule.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(scheduleId: string, value: ScheduleEditorValue) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          visitDate: value.visitDate,
          trimester: value.trimester,
          notes: value.notes,
          motherIds: value.motherIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Could not update the schedule.');
        return false;
      }
      setMode('idle');
      setNotice('Schedule updated. Any reminder prepared for the old details was cleared.');
      router.refresh();
      return true;
    } catch {
      setError('Network error while updating the schedule.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(scheduleId: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/schedule?scheduleId=${encodeURIComponent(scheduleId)}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Could not delete the schedule.');
        return;
      }
      setConfirmDeleteId(null);
      setMode('idle');
      setNotice('Schedule deleted.');
      router.refresh();
    } catch {
      setError('Network error while deleting the schedule.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(schedule: ScheduleRow) {
    setSendingId(schedule.id);
    setError('');
    setNotice('');
    setOutcomes((prev) => ({ ...prev, [schedule.id]: [] }));
    try {
      const response = await fetch('/api/schedule/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Could not send the reminder.');
        return;
      }
      const all: SendOutcome[] = [...(payload.sent ?? []), ...(payload.skipped ?? []), ...(payload.failed ?? [])];
      setOutcomes((prev) => ({ ...prev, [schedule.id]: all }));
      const sent = payload.sent?.length ?? 0;
      const skipped = payload.skipped?.length ?? 0;
      const failed = payload.failed?.length ?? 0;
      setNotice(
        [
          sent > 0 ? `${sent} SMS sent.` : null,
          skipped > 0 ? `${skipped} skipped (already sent).` : null,
          failed > 0 ? `${failed} failed.` : null,
          payload.batchError ?? null,
        ]
          .filter(Boolean)
          .join(' ') || 'Nothing to send.',
      );
      router.refresh();
    } catch {
      setError('Network error while sending the reminder.');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="alert-success" role="status">
          {notice}
        </p>
      )}

      {/* Live provider status: proves the SMS service and credits are real. */}
      {smsStatus && (
        <div className="card p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-muted">Semaphore account</p>
            <p className="text-sm font-semibold text-ink">
              {smsStatus.account.accountName ?? 'Not connected'}
              {smsStatus.account.status ? ` · ${smsStatus.account.status}` : ''}
            </p>
          </div>          <div>
            <p className="text-xs text-muted">Credits available</p>
            <p
              className="text-sm font-semibold"
              style={{
                color:
                  smsStatus.account.creditBalance == null
                    ? 'var(--muted-2)'
                    : smsStatus.account.creditBalance > 0
                      ? 'var(--success)'
                      : 'var(--danger)',
              }}
            >
              {smsStatus.account.creditBalance ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Reminders still due</p>
            <p className="text-sm font-semibold text-ink">{smsStatus.dueSchedules}</p>
          </div>
          {smsStatus.accountError && (
            <p className="text-xs text-danger">{smsStatus.accountError}</p>
          )}
        </div>
      )}

      {canEdit && mode === 'idle' && (
        <div className="flex gap-3">
          <button type="button" className="btn-primary" onClick={() => setMode('create')}>
            Set a new prenatal schedule
          </button>
        </div>
      )}

      {canEdit && mode === 'create' && (
        <ScheduleEditor
          mothers={scopedMothers}
          initial={{ visitDate: '', trimester: '1st', notes: '', motherIds: [] }}
          submitLabel="Create schedule"
          busy={busy}
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
        />
      )}

      {canEdit && typeof mode === 'object' && mode.edit && (
        <ScheduleEditor
          mothers={scopedMothers}
          initial={(() => {
            const target = schedules.find((s) => s.id === mode.edit);
            return {
              visitDate: target?.visit_date ?? '',
              trimester: (target?.trimester ?? '1st') as Trimester,
              notes: target?.notes ?? '',
              motherIds: (target?.recipients ?? []).map((r) => r.pregnant_mother_id),
            };
          })()}
          submitLabel="Save changes"
          busy={busy}
          onSubmit={(value) => handleUpdate(mode.edit, value)}
          onCancel={() => setMode('idle')}
        />
      )}

      {!canEdit && (
        <div className="card p-6 bg-blue-50 border border-blue-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">View-only access</h2>
          <p className="text-sm text-muted">
            You can see the schedules for your purok, but only the BHW Manager, nurse, or admin
            can create, change, or send reminders.
          </p>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink mb-3">
          Upcoming schedules ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="card p-6">
            <p className="text-sm text-muted-2">No upcoming prenatal schedule.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                canEdit={canEdit}
                busy={busy}
                sending={sendingId === schedule.id}
                editing={typeof mode === 'object' && mode.edit === schedule.id}
                confirmingDelete={confirmDeleteId === schedule.id}
                outcomes={outcomes[schedule.id] ?? null}
                onSend={() => handleSend(schedule)}
                onEdit={() => {
                  setError('');
                  setNotice('');
                  setMode({ edit: schedule.id });
                }}
                onRequestDelete={() => setConfirmDeleteId(schedule.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => handleDelete(schedule.id)}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Past schedules ({history.length})</h2>
          <div className="space-y-3">
            {history.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                canEdit={canEdit}
                busy={busy}
                sending={false}
                editing={false}
                confirmingDelete={false}
                outcomes={null}
                onSend={() => handleSend(schedule)}
                onEdit={() => undefined}
                onRequestDelete={() => undefined}
                onCancelDelete={() => undefined}
                onConfirmDelete={() => handleDelete(schedule.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule,
  canEdit,
  busy,
  sending,
  editing,
  confirmingDelete,
  outcomes,
  onSend,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  schedule: ScheduleRow;
  canEdit: boolean;
  busy: boolean;
  sending: boolean;
  editing: boolean;
  confirmingDelete: boolean;
  outcomes: SendOutcome[] | null;
  onSend: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const isOpen = schedule.status === 'scheduled';
  const reachable = schedule.recipients.filter((r) => toE164(r.contact_number));
  const unreachable = schedule.recipients.filter((r) => !toE164(r.contact_number));
  const hasReachable = reachable.length > 0;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-ink">{schedule.visit_date}</span>
            <span className="text-xs text-muted">
              {weekdayLabel(schedule.visit_date)} · {relativeDayLabel(schedule.visit_date)}
            </span>
            <span className={STATUS_BADGE[schedule.status] ?? 'badge-neutral'}>
              {schedule.status}
            </span>
            {schedule.trimester && <span className="badge-neutral">{schedule.trimester} trimester</span>}
          </div>
          {schedule.notes && <p className="text-sm text-muted mt-1">{schedule.notes}</p>}
        </div>

        <div className="text-right text-xs text-muted">
          {schedule.reminder_sent ? (
            <p className="text-[var(--success)] font-medium">
              Reminder sent
              {schedule.reminder_sent_at
                ? ` · ${new Date(schedule.reminder_sent_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`
                : ''}
            </p>
          ) : isOpen ? (
            <p className="text-amber-600 font-medium">
              Reminder not sent — will go out automatically the day before
            </p>
          ) : (
            <p>Closed</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Assigned mothers ({schedule.recipients.length})
        </p>
        {schedule.recipients.length === 0 ? (
          <p className="text-sm text-danger">No mothers assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {schedule.recipients.map((recipient) => (
              <span
                key={recipient.pregnant_mother_id}
                className="badge-neutral"
                title={formatE164(toE164(recipient.contact_number))}
              >
                {recipient.full_name ?? 'Unnamed'}
                {recipient.purok ? ` · P${recipient.purok}` : ''}
                {toE164(recipient.contact_number) ? '' : ' · no number'}
              </span>
            ))}
          </div>
        )}

        {unreachable.length > 0 && (
          <p className="text-xs text-muted mt-2">
            {unreachable.length} mother/mothers have no valid mobile number and will not receive SMS.
          </p>
        )}
      </div>

      {outcomes && outcomes.length > 0 && (
        <div className="mt-4 border-t border-[var(--border-light)] pt-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Result of the last send
          </p>
          <ul className="space-y-1">
            {outcomes.map((outcome, index) => (
              <li key={`${outcome.pregnantMotherId ?? outcome.phone ?? index}`} className="text-sm">
                <span
                  className="badge-low"
                  style={
                    outcome.status === 'sent'
                      ? undefined
                      : outcome.status === 'skipped_duplicate'
                        ? { background: 'var(--surface-alt)', color: 'var(--muted)' }
                        : undefined
                  }
                >
                  {outcome.status === 'sent'
                    ? 'Sent'
                    : outcome.status === 'failed'
                      ? 'Failed'
                      : outcome.status === 'skipped_duplicate'
                        ? 'Already sent'
                        : 'No number'}
                </span>{' '}
                <span className="text-ink">
                  {formatE164(outcome.phone ?? toE164(''))}
                </span>
                {outcome.detail && <span className="text-muted"> — {outcome.detail}</span>}
                {outcome.providerMessageId && (
                  <span className="text-muted"> · ref {outcome.providerMessageId}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && isOpen && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-light)] pt-4">
          <button
            type="button"
            className="btn-primary"
            onClick={onSend}
            disabled={sending || busy || editing || !hasReachable}
            title={
              reachable.length === 0
                ? 'No assigned mother has a usable mobile number.'
                : undefined
            }
          >
            {sending
              ? 'Sending…'
              : schedule.reminder_sent
                ? 'Send reminder again'
                : 'Send reminder now'}
          </button>
          <button type="button" className="btn-secondary" onClick={onEdit} disabled={busy || sending}>
            Edit schedule
          </button>
          {confirmingDelete ? (
            <>
              <button type="button" className="btn-danger" onClick={onConfirmDelete} disabled={busy}>
                Confirm delete
              </button>
              <button type="button" className="btn-ghost" onClick={onCancelDelete} disabled={busy}>
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              onClick={onRequestDelete}
              disabled={busy || sending}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
