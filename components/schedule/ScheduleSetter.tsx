'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ScheduleEditor, { type ScheduleEditorValue, type ScheduleMother, type Trimester } from './ScheduleEditor';
import { formatE164, toE164 } from '@/utils/sms/phone';
import { relativeDayLabel, weekdayLabel } from '@/utils/sms/clock';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/ToastAlert';
import { CalendarDays, Send, Plus, Trash2, Edit, Clock } from 'lucide-react';

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
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && !error && (
        <Alert type="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {/* Live provider status banner */}
      {smsStatus && (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-lg shadow-slate-200/40 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMS Provider</p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                {smsStatus.account.accountName ?? 'Not connected'}
                {smsStatus.account.status ? ` (${smsStatus.account.status})` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Credits Available</p>
              <p
                className={`text-xs sm:text-sm font-extrabold mt-0.5 ${
                  smsStatus.account.creditBalance == null
                    ? 'text-slate-400'
                    : smsStatus.account.creditBalance > 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                }`}
              >
                {smsStatus.account.creditBalance ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reminders Due</p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{smsStatus.dueSchedules}</p>
            </div>
          </div>
          {smsStatus.accountError && (
            <p className="text-xs font-semibold text-red-500">{smsStatus.accountError}</p>
          )}
        </div>
      )}

      {canEdit && mode === 'idle' && (
        <div>
          <Button onClick={() => setMode('create')} leftIcon={<Plus size={18} />}>
            Set New Prenatal Schedule
          </Button>
        </div>
      )}

      {canEdit && mode === 'create' && (
        <ScheduleEditor
          mothers={scopedMothers}
          initial={{ visitDate: '', trimester: '1st', notes: '', motherIds: [] }}
          submitLabel="Create Schedule"
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
          submitLabel="Save Changes"
          busy={busy}
          onSubmit={(value) => handleUpdate(mode.edit, value)}
          onCancel={() => setMode('idle')}
        />
      )}

      {!canEdit && (
        <div className="bg-blue-50/80 rounded-2xl border border-blue-200/80 p-5 text-blue-900 text-xs sm:text-sm font-medium">
          <p className="font-bold text-blue-950 mb-1">View-only schedule access</p>
          <p>
            You can see the schedules for your assigned purok, but only the BHW Manager, nurse, or admin can create, update, or dispatch SMS reminders.
          </p>
        </div>
      )}

      {/* Upcoming Schedules */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays size={18} className="text-[var(--brand)]" />
          <span>Upcoming Schedules ({upcoming.length})</span>
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 text-center">
            <p className="text-xs text-slate-400 font-medium">No upcoming prenatal schedules set.</p>
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

      {/* Past Schedules */}
      {history.length > 0 && (
        <section className="space-y-4 pt-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-slate-400" />
            <span>Past Schedules ({history.length})</span>
          </h2>
          <div className="space-y-4">
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
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-extrabold text-slate-900">{schedule.visit_date}</span>
            <span className="text-xs font-semibold text-slate-500">
              {weekdayLabel(schedule.visit_date)} · {relativeDayLabel(schedule.visit_date)}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[var(--brand)] border border-teal-200/60">
              {schedule.status}
            </span>
            {schedule.trimester && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/80">
                {schedule.trimester} trimester
              </span>
            )}
          </div>
          {schedule.notes && <p className="text-xs text-slate-600 font-medium mt-1.5">{schedule.notes}</p>}
        </div>

        <div className="text-xs font-semibold">
          {schedule.reminder_sent ? (
            <p className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
              Reminder sent
              {schedule.reminder_sent_at
                ? ` · ${new Date(schedule.reminder_sent_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`
                : ''}
            </p>
          ) : isOpen ? (
            <p className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block">
              Auto-reminder scheduled for day prior
            </p>
          ) : (
            <p className="text-slate-400">Closed</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Assigned Mothers ({schedule.recipients.length})
        </p>
        {schedule.recipients.length === 0 ? (
          <p className="text-xs font-semibold text-red-500">No mothers assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {schedule.recipients.map((recipient) => (
              <span
                key={recipient.pregnant_mother_id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs"
                title={formatE164(toE164(recipient.contact_number))}
              >
                <span>{recipient.full_name ?? 'Unnamed'}</span>
                {recipient.purok && <span className="text-slate-400">Zone {recipient.purok}</span>}
                {!toE164(recipient.contact_number) && <span className="text-red-500">no number</span>}
              </span>
            ))}
          </div>
        )}

        {unreachable.length > 0 && (
          <p className="text-xs text-slate-400 font-medium mt-2">
            {unreachable.length} mother(s) have no valid mobile number and won&apos;t receive SMS.
          </p>
        )}
      </div>

      {outcomes && outcomes.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Last Send Results
          </p>
          <div className="space-y-1.5">
            {outcomes.map((outcome, index) => (
              <div key={`${outcome.pregnantMotherId ?? outcome.phone ?? index}`} className="text-xs font-medium flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    outcome.status === 'sent'
                      ? 'bg-emerald-50 text-emerald-700'
                      : outcome.status === 'skipped_duplicate'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-red-50 text-red-600'
                  }`}
                >
                  {outcome.status === 'sent'
                    ? 'Sent'
                    : outcome.status === 'failed'
                      ? 'Failed'
                      : outcome.status === 'skipped_duplicate'
                        ? 'Already sent'
                        : 'No number'}
                </span>
                <span className="font-mono text-slate-700">{formatE164(outcome.phone ?? toE164(''))}</span>
                {outcome.detail && <span className="text-slate-400">— {outcome.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && isOpen && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <Button
            onClick={onSend}
            isLoading={sending}
            disabled={busy || editing || !hasReachable}
            leftIcon={<Send size={16} />}
          >
            {schedule.reminder_sent ? 'Resend Reminder' : 'Send Reminder Now'}
          </Button>
          <Button variant="secondary" onClick={onEdit} disabled={busy || sending} leftIcon={<Edit size={16} />}>
            Edit Schedule
          </Button>
          {confirmingDelete ? (
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="danger" size="sm" onClick={onConfirmDelete} disabled={busy}>
                Confirm Delete
              </Button>
              <Button variant="outline" size="sm" onClick={onCancelDelete} disabled={busy}>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onRequestDelete} disabled={busy || sending} leftIcon={<Trash2 size={16} />}>
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
