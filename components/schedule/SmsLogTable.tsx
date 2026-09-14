'use client';

import { useState, useMemo } from 'react';
import SearchBar from '@/components/ui/SearchBar';

export type SmsLogRow = {
  id: string;
  recipient_count: number;
  recipients: string;
  message: string;
  message_type: 'general' | 'prenatal_reminder' | 'missed_visit_follow_up' | 'risk_alert' | 'health_tip' | 'nutrition_tip' | 'care_message';
  status: 'success' | 'failed';
  delivery_status: 'unknown' | 'queued' | 'sent' | 'delivered' | 'failed';
  error_message: string | null;
  created_at: string;
  sender: string | null;
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

export default function SmsLogTable({ logs, followUps }: { logs: SmsLogRow[]; followUps: FollowUpRow[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [type, setType] = useState<'all' | SmsLogRow['message_type']>('all');
  const [quickMessage, setQuickMessage] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (status !== 'all' && log.status !== status) return false;
      if (type !== 'all' && log.message_type !== type) return false;
      if (q) {
        const inMessage = log.message.toLowerCase().includes(q);
        const inSender  = (log.sender ?? '').toLowerCase().includes(q);
        if (!inMessage && !inSender) return false;
      }
      return true;
    });
  }, [logs, search, status, type]);

  const hasFilters = search || status !== 'all' || type !== 'all';

  async function quickSend(item: FollowUpRow) {
    if (!item.contactNumber) return;
    const message = quickMessage[item.id] || (item.messageType === 'risk_alert'
      ? 'Important prenatal health reminder: please contact your BHW or nurse to review your high-risk care plan.'
      : 'We noticed your prenatal visit was missed. Please contact the Barangay Health Center to arrange a follow-up schedule.');
    setSendingId(item.id);
    const response = await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numbers: [item.contactNumber], pregnantMotherIds: [item.motherId], message, messageType: item.messageType }) });
    setSendingId(null);
    if (response.ok) { setSentId(item.id); setTimeout(() => setSentId(null), 2500); }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by message or sender…"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | 'success' | 'failed')}
          className="form-select"
          style={{ width: 'auto', minWidth: '130px' }}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="success">Sent</option>
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
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatus('all'); setType('all'); }}
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
            {followUps.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <p className="text-sm font-medium">{item.motherName}</p>
                  <p className="text-xs text-muted">{item.reason} · {item.contactNumber ?? 'No contact number'}</p>
                </div>
                <input className="form-input" style={{ maxWidth: '360px' }} value={quickMessage[item.id] ?? ''} onChange={(e) => setQuickMessage((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="Quick message" aria-label={`Quick message for ${item.motherName}`} />
                <button type="button" className="btn-primary" disabled={!item.contactNumber || sendingId === item.id} onClick={() => quickSend(item)}>{sendingId === item.id ? 'Sending…' : sentId === item.id ? 'Sent' : 'Quick Send'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Sent By</th>
              <th>Recipient</th>
              <th>Message</th>
              <th>Type</th>
              <th>Status</th>
              <th>Delivery</th>
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
            {filtered.map((log) => (
              <tr key={log.id} style={{ verticalAlign: 'top' }}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{log.sender ?? '—'}</td>
                <td><span style={{ color: 'var(--ink)', fontWeight: 500 }}>{log.recipients}</span><br /><span className="text-xs text-muted">{log.recipient_count} recipient(s)</span></td>
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
                  {log.status === 'failed' && log.error_message && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                      {log.error_message}
                    </p>
                  )}
                </td>
                <td><span className="badge-neutral">{TYPE_LABELS[log.message_type]}</span></td>
                <td>
                  {log.status === 'success'
                    ? <span className="badge-low">Sent</span>
                    : <span className="badge-high">Failed</span>
                  }
                </td>
                <td>{log.delivery_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
