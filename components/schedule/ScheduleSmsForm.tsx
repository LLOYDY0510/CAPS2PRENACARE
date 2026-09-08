'use client';

import { useState } from 'react';

type Record = {
  id: string;
  full_name: string;
  purok: string | null;
  contact_number: string | null;
  edd: string | null;
};

export default function ScheduleSmsForm({ records }: { records: Record[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(
    'Hi! This is a reminder for your upcoming prenatal checkup. Please visit the health center on your scheduled date. Salamat!'
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const withContact = records.filter((r) => r.contact_number);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === withContact.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(withContact.map((r) => r.id)));
    }
  }

  async function handleSend() {
    setResult(null);

    if (selected.size === 0) {
      setResult({ type: 'error', text: 'Select at least one pregnant mother.' });
      return;
    }
    if (!message.trim()) {
      setResult({ type: 'error', text: 'Message cannot be empty.' });
      return;
    }

    const numbers = withContact
      .filter((r) => selected.has(r.id))
      .map((r) => r.contact_number as string);

    setSending(true);

    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ type: 'error', text: data.error || 'Failed to send SMS.' });
      } else {
        setResult({
          type: 'success',
          text: `SMS sent successfully to ${numbers.length} recipient(s).`,
        });
        setSelected(new Set());
      }
    } catch (err) {
      setResult({
        type: 'error',
        text: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recipient list */}
      <div className="lg:col-span-2 card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <p className="text-sm font-medium">
            Select recipients ({selected.size}/{withContact.length})
          </p>
          <button
            onClick={toggleAll}
            className="btn-ghost"
            style={{ fontSize: '0.8125rem', padding: '0.25rem 0.625rem' }}
          >
            {selected.size === withContact.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {withContact.length === 0 && (
            <p className="px-4 py-8 text-center text-muted-2 text-sm">
              No pregnant mothers with a contact number found.
            </p>
          )}
          {withContact.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                className="rounded border-gray-300"
              />
              <div className="flex-1 text-sm">
                <p className="font-medium">{r.full_name}</p>
                <p className="text-muted text-xs">
                  Purok {r.purok ?? '—'} · {r.contact_number}
                  {r.edd ? ` · Due ${r.edd}` : ''}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Message composer */}
      <div className="card p-5 h-fit">
        <label className="block text-sm font-medium mb-2">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
        />
        <p className="text-xs text-muted-2 mt-1">{message.length} characters</p>

        {result && (
          <p
            className={`text-sm mt-3 p-2 rounded ${
              result.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {result.text}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={sending}
          className="btn-primary w-full mt-4"
        >
          {sending ? 'Sending…' : `Send SMS (${selected.size})`}
        </button>
      </div>
    </div>
  );
}