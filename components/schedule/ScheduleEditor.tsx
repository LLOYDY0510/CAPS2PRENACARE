'use client';

import { useMemo, useState } from 'react';

export type ScheduleMother = {
  id: string;
  full_name: string | null;
  purok: string | null;
  contact_number: string | null;
};

export type Trimester = '1st' | '2nd' | '3rd';

export type ScheduleEditorValue = {
  visitDate: string;
  trimester: Trimester;
  notes: string;
  motherIds: string[];
};

export default function ScheduleEditor({
  mothers,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
}: {
  mothers: ScheduleMother[];
  initial: ScheduleEditorValue;
  submitLabel: string;
  onSubmit: (value: ScheduleEditorValue) => Promise<boolean>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [visitDate, setVisitDate] = useState(initial.visitDate);
  const [trimester, setTrimester] = useState<Trimester>(initial.trimester);
  const [notes, setNotes] = useState(initial.notes);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial.motherIds));
  const [purokFilter, setPurokFilter] = useState('all');
  const [error, setError] = useState('');

  const puroks = useMemo(() => {
    const values = mothers.map((m) => m.purok).filter((p): p is string => !!p);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [mothers]);

  const visible = useMemo(
    () => (purokFilter === 'all' ? mothers : mothers.filter((m) => (m.purok ?? 'Unassigned') === purokFilter)),
    [mothers, purokFilter],
  );

  const withoutContact = visible.filter((m) => !m.contact_number).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === visible.length ? new Set() : new Set(visible.map((m) => m.id)),
    );
  }

  function selectPurok(purok: string) {
    setPurokFilter(purok);
    const ids = mothers.filter((m) => (m.purok ?? 'Unassigned') === purok).map((m) => m.id);
    setSelected((prev) => new Set([...prev, ...ids]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!visitDate) {
      setError('Choose the visit date.');
      return;
    }
    if (selected.size === 0) {
      setError('Assign at least one pregnant mother.');
      return;
    }

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (visitDate < today) {
      setError('The visit date cannot be in the past.');
      return;
    }

    const ok = await onSubmit({
      visitDate,
      trimester,
      notes,
      motherIds: Array.from(selected),
    });
    if (!ok) {
      // Keep the form and its values so the manager can correct and retry.
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Visit details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="schedule-trimester">
              Trimester
            </label>
            <select
              id="schedule-trimester"
              value={trimester}
              onChange={(e) => setTrimester(e.target.value as Trimester)}
              className="form-select"
            >
              <option value="1st">1st Trimester</option>
              <option value="2nd">2nd Trimester</option>
              <option value="3rd">3rd Trimester</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="schedule-visit-date">
              Visit date
            </label>
            <input
              id="schedule-visit-date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="form-input"
              required
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="form-label" htmlFor="schedule-notes">
            Notes for the team <span className="font-normal text-muted-2">(optional)</span>
          </label>
          <input
            id="schedule-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Bring BP measurement and previous lab results"
            className="form-input"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="section-header !py-3 flex-wrap gap-2">
          <p className="text-sm font-medium">
            Pregnant mothers ({selected.size} of {mothers.length} selected)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {puroks.length > 0 && (
              <select
                value={purokFilter}
                onChange={(e) => {
                  setPurokFilter(e.target.value);
                  if (e.target.value !== 'all') selectPurok(e.target.value);
                }}
                className="form-select"
                style={{ width: 'auto', minWidth: '140px' }}
                aria-label="Filter by purok"
              >
                <option value="all">All puroks</option>
                {puroks.map((p) => (
                  <option key={p} value={p}>
                    Purok {p}
                  </option>
                ))}
              </select>
            )}
            <button type="button" onClick={toggleAll} className="btn-ghost">
              {selected.size === visible.length && visible.length > 0 ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {visible.length === 0 && (
            <p className="px-4 py-8 text-center text-muted-2 text-sm">
              No pregnant mothers found for this purok.
            </p>
          )}
          {visible.map((mother) => (
            <label
              key={mother.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#EEF1F4] last:border-0 hover:bg-[#F8FAFB] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(mother.id)}
                onChange={() => toggle(mother.id)}
                className="rounded"
              />
              <div className="flex-1 text-sm">
                <p className="font-medium">{mother.full_name ?? 'Unnamed mother'}</p>
                <p className="text-muted text-xs">
                  Purok {mother.purok ?? '—'} ·{' '}
                  {mother.contact_number ? (
                    mother.contact_number
                  ) : (
                    <span className="text-danger">no contact number — cannot receive SMS</span>
                  )}
                </p>
              </div>
            </label>
          ))}
        </div>

        {withoutContact > 0 && (
          <p className="px-4 py-2 text-xs text-muted bg-[#F8FAFB] border-t border-[#EEF1F4]">
            {withoutContact} of the mothers shown have no contact number. They can still be
            scheduled, but no SMS will reach them.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
