'use client';

import { Fragment, useState, useMemo } from 'react';
import SearchBar from '@/components/ui/SearchBar';
import { formatE164, toE164 } from '@/utils/sms/phone';

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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [type, setType] = useState<'all' | SmsLogRow['message_type']>('all');
  const [quickMessage, setQuickMessage] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { tone: 'ok' | 'error'; text: string }>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

      if (!response.ok) {
        setFeedback((prev) => ({
          ...prev,
          [item.id]: { tone: 'error', text: payload.error ?? 'The message was not sent.' },
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
            sent > 0 ? `Sent to ${formatE164(toE164(item.contactNumber))}` : null,
            skipped > 0 ? 'skipped (already sent today)' : null,
            failed > 0 ? 'failed' : null,
            payload.batchError ?? null,
          ]
            .filter(Boolean)
            .join(' · '),
        },
      }));
      // Pull the new row so the log reflects what actually happened.
      window.location.reload();
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
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search message, sender, or number…" />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | 'success' | 'failed')}
          className="form-select"
          style={{ width: 'auto', minWidth: '130px' }}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="success">Accepted</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="form-select"
          style={{ width: 'auto', minWidth: '170px' }}
          aria-label="Filter by message type"
        >
          <option value="all">All Message Types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setSearch('');
              setStatus('all');
              setType('all');
            }}
            className="btn-ghost"
            style={{ fontSize: '0.75rem' }}
          >
            Clear filters
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {filtered.length} of {logs.length} entries
        </span>
      </div>

      {followUps.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Follow-up Needed</h2>
              <p className="text-xs text-muted">Missed checkups and high-risk cases needing contact.</p>
            </div>
            <span className="badge-warning">{followUps.length} pending</span>
          </div>
          <div className="space-y-2">
            {followUps.map((item) => {
              const note = feedback[item.id];
              return (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <p className="text-sm font-medium">{item.motherName}</p>
                      <p className="text-xs text-muted">
                        {item.reason} · {item.contactNumber ?? 'No contact number'}
                      </p>
                    </div>
                    <input
                      className="form-input"
                      style={{ maxWidth: '360px' }}
                      value={quickMessage[item.id] ?? QUICK_DEFAULTS[item.messageType]}
                      onChange={(e) =>
                        setQuickMessage((current) => ({ ...current, [item.id]: e.target.value }))
                      }
                      placeholder="Quick message"
                      aria-label={`Quick message for ${item.motherName}`}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!item.contactNumber || sendingId === item.id}
                      onClick={() => quickSend(item)}
                    >
                      {sendingId === item.id ? 'Sending…' : 'Quick Send'}
                    </button>
                  </div>
                  {note && (
                    <p
                      role="status"
                      className="text-xs mt-2"
                      style={{ color: note.tone === 'ok' ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {note.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Trigger</th>
              <th>Sent By</th>
              <th>Recipient</th>
              <th>Message</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
                  {hasFilters ? 'No entries match the current filters.' : 'No SMS sent yet.'}
                </td>
              </tr>
            )}
            {filtered.map((log) => {
              const isOpen = expanded.has(log.id);
              const failedCount = log.receipts.filter((r) => r.providerStatus === 'failed').length;
              return (
                <Fragment key={log.id}>
                  <tr style={{ verticalAlign: 'top' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('en-PH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="badge-neutral">{log.send_kind === 'auto' ? 'Automatic' : 'Manual'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{log.sender ?? 'System'}</td>
                    <td>
                      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{log.recipients}</span>
                      <br />
                      <span className="text-xs text-muted">{log.recipient_count} recipient(s)</span>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <p
                        style={{
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          color: 'var(--ink)',
                        }}
                      >
                        {log.message}
                      </p>
                      {log.error_message && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                          {log.error_message}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="badge-neutral">{TYPE_LABELS[log.message_type]}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {log.status === 'success' ? (
                        <span className="badge-low">
                          {failedCount > 0 ? `${log.receipts.length - failedCount}/${log.receipts.length} sent` : 'Sent'}
                        </span>
                      ) : (
                        <span className="badge-high">Failed</span>
                      )}
                      {log.receipts.length > 0 && (
                        <>
                          <br />
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem' }}
                            aria-expanded={isOpen}
                            onClick={() => toggleExpanded(log.id)}
                          >
                            {isOpen ? 'Hide numbers' : 'View numbers'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${log.id}-receipts`}>                      <td colSpan={7} style={{ background: 'var(--surface-alt)' }}>
                        <ul className="space-y-1">
                          {log.receipts.map((receipt, index) => (
                            <li key={`${log.id}-${index}`} className="text-xs flex flex-wrap gap-2 items-center">
                              <span
                                className="badge-low"
                                style={
                                  receipt.providerStatus === 'sent'
                                    ? undefined
                                    : { background: 'var(--danger)', color: '#fff' }
                                }
                              >
                                {receipt.providerStatus}
                              </span>
                              <span style={{ color: 'var(--ink)' }}>
                                {receipt.motherName ?? 'Unlinked number'}
                              </span>
                              <span className="text-muted">{formatE164(toE164(receipt.contactNumber))}</span>
                              {receipt.providerMessageId && (
                                <span className="text-muted">ref {receipt.providerMessageId}</span>
                              )}
                              {receipt.errorMessage && (
                                <span style={{ color: 'var(--danger)' }}>{receipt.errorMessage}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
