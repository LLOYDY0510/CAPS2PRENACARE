'use client';

import { Fragment, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/ui/SearchBar';
import { Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { formatE164, toE164 } from '@/utils/sms/phone';
import { friendlySmsError, DryRunBadge } from '@/components/schedule/smsStatusUi';
import { Send, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

export type SmsLogRow = {
  id: string;
  recipient_count: number;
  recipients: string;
  message: string;
  message_type:
    | 'general'
    | 'prenatal_reminder'
    | 'missed_visit_follow_up'
    | 'risk_alert'
    | 'health_tip'
    | 'nutrition_tip'
    | 'care_message';
  status: 'success' | 'failed';
  delivery_status: 'unknown' | 'queued' | 'sent' | 'delivered' | 'failed';
  error_message: string | null;
  created_at: string;
  sender: string | null;
  send_kind: 'auto' | 'manual';
  receipts: {
    motherName: string | null;
    contactNumber: string;
    providerStatus: string;
    providerMessageId: string | null;
    errorMessage: string | null;
  }[];
};

type FollowUpRow = {
  id: string;
  motherId: string;
  motherName: string;
  contactNumber: string | null;
  reason: string;
  status: string;
  messageType: 'missed_visit_follow_up' | 'risk_alert';
};

const PAGE_SIZE = 10;

const TYPE_LABELS: Record<SmsLogRow['message_type'], string> = {
  general: 'General',
  prenatal_reminder: 'Prenatal reminder',
  missed_visit_follow_up: 'Missed-visit follow-up',
  risk_alert: 'Risk alert',
  health_tip: 'Health tip',
  nutrition_tip: 'Nutrition tip',
  care_message: 'Care-team message',
};

const QUICK_DEFAULTS: Record<FollowUpRow['messageType'], string> = {
  risk_alert:
    'Important prenatal health reminder: please contact your BHW or nurse to review your high-risk care plan.',
  missed_visit_follow_up:
    'We noticed your prenatal visit was missed. Please contact the Barangay Health Center to arrange a follow-up schedule.',
};

export default function SmsLogTable({
  logs,
  followUps,
}: {
  logs: SmsLogRow[];
  followUps: FollowUpRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [type, setType] = useState<'all' | SmsLogRow['message_type']>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [quickMessage, setQuickMessage] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { tone: 'ok' | 'error'; text: string }>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // null = unknown (health endpoint is admin-only; non-admins simply never see the badge).
  const [dryRun, setDryRun] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sms/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.dryRun === 'boolean') setDryRun(data.dryRun);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (status !== 'all' && log.status !== status) return false;
      if (type !== 'all' && log.message_type !== type) return false;
      if (!q) return true;
      const haystack = [
        log.message,
        log.sender ?? '',
        log.recipients,
        ...log.receipts.map((r) => `${r.motherName ?? ''} ${r.contactNumber} ${r.providerMessageId ?? ''}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, search, status, type]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const page = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const hasFilters = !!search || status !== 'all' || type !== 'all';

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function quickSend(item: FollowUpRow) {
    if (!item.contactNumber) return;
    const message = (quickMessage[item.id] ?? QUICK_DEFAULTS[item.messageType]).trim();
    if (!message) {
      setFeedback((prev) => ({ ...prev, [item.id]: { tone: 'error', text: 'Enter a message first.' } }));
      return;
    }

    setSendingId(item.id);
    setFeedback((prev) => ({ ...prev, [item.id]: { tone: 'ok', text: 'Sending…' } }));
    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numbers: [item.contactNumber],
          pregnantMotherIds: [item.motherId],
          message,
          messageType: item.messageType,
        }),
      });
      const payload = await response.json();
      if (typeof payload.dryRun === 'boolean') setDryRun(payload.dryRun);

      if (!response.ok) {
        setFeedback((prev) => ({
          ...prev,
          [item.id]: {
            tone: 'error',
            text:
              friendlySmsError(payload.batchError, payload.friendlyError) ??
              payload.error ??
              'The message was not sent.',
          },
        }));
        return;
      }

      const sent = payload.sent?.length ?? 0;
      const skipped = payload.skipped?.length ?? 0;
      const failed = payload.failed?.length ?? 0;
      setFeedback((prev) => ({
        ...prev,
        [item.id]: {
          tone: sent > 0 ? 'ok' : 'error',
          text: [
            payload.dryRun ? 'DRY RUN — no SMS left the server' : null,
            sent > 0 ? `Sent to ${formatE164(toE164(item.contactNumber))}` : null,
            skipped > 0 ? 'skipped (already sent today)' : null,
            failed > 0 ? 'failed' : null,
            friendlySmsError(payload.batchError, payload.friendlyError),
          ]
            .filter(Boolean)
            .join(' · '),
        },
      }));
      // Refresh server-rendered log rows without wiping client feedback/badge.
      router.refresh();
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [item.id]: { tone: 'error', text: 'Network error — nothing was sent.' },
      }));
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls Card */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-lg shadow-slate-200/40 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex-1 min-w-[220px]">
            <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search message, sender, or number..." />
          </div>

          <div className="w-36">
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value as 'all' | 'success' | 'failed'); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'success', label: 'Accepted' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>

          <div className="w-48">
            <Select
              value={type}
              onChange={(e) => { setType(e.target.value as typeof type); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Types' },
                ...Object.entries(TYPE_LABELS).map(([val, lbl]) => ({ value: val, label: lbl })),
              ]}
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus('all'); setType('all'); setCurrentPage(1); }} leftIcon={<RotateCcw size={14} />}>
              Clear
            </Button>
          )}
        </div>

        <span className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
          {dryRun === true && <DryRunBadge />}
          {filtered.length} of {logs.length} entries
        </span>
      </div>

      {/* Follow-up Pending Banner */}
      {followUps.length > 0 && (
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Follow-up Action Needed</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Missed checkups and high-risk cases needing contact</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
              {followUps.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {followUps.map((item) => {
              const note = feedback[item.id];
              return (
                <div key={item.id} className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <p className="font-bold text-xs sm:text-sm text-slate-900">{item.motherName}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {item.reason} · {item.contactNumber ?? 'No contact number'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <input
                        className="h-10 px-3.5 bg-white text-xs sm:text-sm font-medium rounded-2xl border border-amber-200 focus:border-[var(--brand)] outline-none w-full shadow-xs"
                        value={quickMessage[item.id] ?? QUICK_DEFAULTS[item.messageType]}
                        onChange={(e) =>
                          setQuickMessage((current) => ({ ...current, [item.id]: e.target.value }))
                        }
                        placeholder="Quick message text..."
                      />
                      <Button
                        size="sm"
                        disabled={!item.contactNumber}
                        isLoading={sendingId === item.id}
                        onClick={() => quickSend(item)}
                        leftIcon={<Send size={14} />}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                  {note && (
                    <p className={`text-xs font-semibold ${note.tone === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {note.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Logs Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 overflow-hidden">
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4">Date &amp; Time</th>
                <th className="py-3.5 px-4">Trigger</th>
                <th className="py-3.5 px-4">Sent By</th>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Message</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    {hasFilters ? 'No entries match the current filters.' : 'No SMS sent yet.'}
                  </td>
                </tr>
              )}
              {paginated.map((log) => {
                const isOpen = expanded.has(log.id);
                const failedCount = log.receipts.filter((r) => r.providerStatus === 'failed').length;
                return (
                  <Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-500 text-xs">
                        {new Date(log.created_at).toLocaleString('en-PH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/80">
                          {log.send_kind === 'auto' ? 'Automatic' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">{log.sender ?? 'System'}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{log.recipients}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{log.recipient_count} recipient(s)</p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 font-medium">{log.message}</p>
                        {log.error_message && (
                          <p className="text-xs text-red-600 font-semibold mt-1">{log.error_message}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[var(--brand)] border border-teal-200/60">
                          {TYPE_LABELS[log.message_type]}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.status === 'success' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {failedCount > 0 ? `${log.receipts.length - failedCount}/${log.receipts.length} sent` : 'Sent'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                            Failed
                          </span>
                        )}
                        {log.receipts.length > 0 && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(log.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand)] hover:underline"
                            >
                              <span>{isOpen ? 'Hide numbers' : 'View numbers'}</span>
                              {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${log.id}-receipts`} className="bg-slate-50/90">
                        <td colSpan={7} className="p-4">
                          <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Receipts</p>
                            {log.receipts.map((receipt, index) => (
                              <div key={`${log.id}-${index}`} className="text-xs flex flex-wrap gap-2 items-center font-medium">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    receipt.providerStatus === 'sent'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-red-50 text-red-600 border border-red-200'
                                  }`}
                                >
                                  {receipt.providerStatus}
                                </span>
                                <span className="font-bold text-slate-800">{receipt.motherName ?? 'Unlinked number'}</span>
                                <span className="font-mono text-slate-500">{formatE164(toE164(receipt.contactNumber))}</span>
                                {receipt.providerMessageId && (
                                  <span className="text-slate-400">· ref {receipt.providerMessageId}</span>
                                )}
                                {receipt.errorMessage && (
                                  <span className="text-red-600 font-semibold">{receipt.errorMessage}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Component */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filtered.length}
          itemsPerPage={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
