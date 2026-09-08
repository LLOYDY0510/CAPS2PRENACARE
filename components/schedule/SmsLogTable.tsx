'use client';

import { useState, useMemo } from 'react';
import SearchBar from '@/components/ui/SearchBar';

export type SmsLogRow = {
  id: string;
  recipient_count: number;
  message: string;
  status: 'success' | 'failed';
  error_message: string | null;
  created_at: string;
  sender: string | null;
};

export default function SmsLogTable({ logs }: { logs: SmsLogRow[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'success' | 'failed'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (status !== 'all' && log.status !== status) return false;
      if (q) {
        const inMessage = log.message.toLowerCase().includes(q);
        const inSender  = (log.sender ?? '').toLowerCase().includes(q);
        if (!inMessage && !inSender) return false;
      }
      return true;
    });
  }, [logs, search, status]);

  const hasFilters = search || status !== 'all';

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

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatus('all'); }}
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

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Sent By</th>
              <th>Recipients</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
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
                <td>{log.recipient_count}</td>
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
                <td>
                  {log.status === 'success'
                    ? <span className="badge-low">Sent</span>
                    : <span className="badge-high">Failed</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
