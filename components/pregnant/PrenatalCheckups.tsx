'use client';

import { useState } from 'react';
import { getPrenatalVisitStatus, prenatalStatusLabel } from '@/utils/prenatalStatus';

type Checkup = {
  id: string;
  trimester: '1st' | '2nd' | '3rd';
  checkup_date: string;
  scheduled_checkup_date: string | null;
  actual_checkup_date: string | null;
  blood_pressure: string | null;
  weight_kg: number | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  scheduled_for: string | null;
};

const TRIMESTERS: ('1st' | '2nd' | '3rd')[] = ['1st', '2nd', '3rd'];

export default function PrenatalCheckups({
  motherId,
  initialCheckups,
  scheduledDates,
  canEdit = true,
}: {
  motherId: string;
  initialCheckups: Checkup[];
  scheduledDates: Record<'1st' | '2nd' | '3rd', string | null>;
  canEdit?: boolean;
}) {
  const [checkups, setCheckups]           = useState(initialCheckups);
  const [activeTrimester, setActiveTrimester] = useState<'1st' | '2nd' | '3rd'>('1st');
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ blood_pressure: '', weight_kg: '', notes: '' });
  const [saving, setSaving]               = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [error, setError]                 = useState('');
  const [notice, setNotice]               = useState('');

  const grouped = TRIMESTERS.reduce((acc, tri) => {
    acc[tri] = checkups
      .filter((c) => c.trimester === tri)
      .sort((a, b) => (a.scheduled_checkup_date ?? a.checkup_date).localeCompare(b.scheduled_checkup_date ?? b.checkup_date));
    return acc;
  }, {} as Record<string, Checkup[]>);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    const scheduledCheckupDate = scheduledDates[activeTrimester];
    if (!scheduledCheckupDate) {
      setError(`No ${activeTrimester} trimester schedule exists for this mother.`);
      return;
    }

    const weight = form.weight_kg ? Number(form.weight_kg) : null;
    if (weight != null && (!Number.isFinite(weight) || weight <= 0 || weight > 300)) {
      setError('Weight must be between 0 and 300 kg.');
      return;
    }

    if (form.blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(form.blood_pressure.trim())) {
      setError('Blood pressure must use the format 120/80.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/prenatal-checkups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregnantMotherId: motherId,
          trimester: activeTrimester,
          bloodPressure: form.blood_pressure,
          weightKg: weight,
          notes: form.notes,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { data?: Checkup; error?: string };

      if (!response.ok || !result.data) {
        setError(result.error ?? 'Failed to save checkup.');
        return;
      }

      // The API updates the existing row for this trimester when one exists,
      // so replace by id. Filtering the whole trimester would hide the other
      // visits recorded in the same trimester.
      const saved = result.data;
      setCheckups((prev) => [...prev.filter((checkup) => checkup.id !== saved.id), saved]);
      setForm({ blood_pressure: '', weight_kg: '', notes: '' });
      setShowForm(false);
      setNotice('Checkup saved.');
    } catch {
      setError('Network error while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this checkup record?');
    if (!confirmed) return;

    setError('');
    setNotice('');
    setDeletingId(id);

    try {
      const response = await fetch('/api/prenatal-checkups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pregnantMotherId: motherId }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Failed to delete the checkup.');
        return;
      }
      setCheckups((prev) => prev.filter((c) => c.id !== id));
      setNotice('Checkup deleted.');
    } catch {
      setError('Network error while deleting. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card">
      {/* Card header */}
      <div className="section-header">
        <h2>Prenatal Checkups</h2>
      </div>

      {/* Trimester tabs */}
      <div
        className="flex"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-alt)',
          padding: '0 1rem',
        }}
      >
        {TRIMESTERS.map((tri) => {
          const active = activeTrimester === tri;
          return (
            <button
              key={tri}
              onClick={() => { setActiveTrimester(tri); setShowForm(false); }}
              style={{
                padding: '0.625rem 0.875rem',
                fontSize: '0.8125rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--brand)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
                background: 'none',
                border: 'none',
                borderBottomWidth: '2px',
                borderBottomStyle: 'solid',
                borderBottomColor: active ? 'var(--brand)' : 'transparent',
                cursor: 'pointer',
                transition: 'color 0.15s',
                marginBottom: '-1px',
              }}
            >
              {tri} Trimester
              <span
                style={{
                  marginLeft: '0.375rem',
                  fontSize: '0.6875rem',
                  color: 'var(--muted-2)',
                }}
              >
                ({grouped[tri]?.length ?? 0})
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '1rem' }}>
        {error && (
          <div className="alert-error mb-3" role="alert">
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="alert-success mb-3" role="status">
            {notice}
          </div>
        )}

        {/* Checkup list */}
        {grouped[activeTrimester].length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              fontSize: '0.8125rem',
              color: 'var(--muted-2)',
            }}
          >
            No checkups recorded for the {activeTrimester} trimester.
          </p>
        ) : (
          <div className="mb-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scheduled Date</th>
                  <th>Actual Date</th>
                  <th>Blood Pressure</th>
                  <th>Weight (kg)</th>
                  <th>Notes</th>
                  <th>Status</th>
                  {canEdit && <th style={{ width: '60px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {grouped[activeTrimester].map((c) => {
                  const status = getPrenatalVisitStatus({
                    scheduledFor:
                      scheduledDates[c.trimester] ??
                      c.scheduled_checkup_date ??
                      c.scheduled_for ??
                      c.checkup_date,
                    actualCheckupDate: c.actual_checkup_date,
                    recordedStatus: c.status,
                  });
                  const statusClass =
                    status === 'completed'
                      ? 'badge-low'
                      : status === 'missed'
                        ? 'badge-high'
                        : 'badge-neutral';
                  return (
                    <tr key={c.id}>
                      <td data-label="Scheduled Date" className="font-medium text-ink">
                        {scheduledDates[c.trimester] ??
                          c.scheduled_checkup_date ??
                          c.scheduled_for ??
                          c.checkup_date}
                      </td>
                      <td data-label="Actual Date">{c.actual_checkup_date ?? '—'}</td>
                      <td data-label="Blood Pressure">{c.blood_pressure ?? '—'}</td>
                      <td data-label="Weight (kg)">{c.weight_kg != null ? `${c.weight_kg} kg` : '—'}</td>
                      <td data-label="Notes" style={{ maxWidth: '240px' }}>
                        {c.notes ?? '—'}
                      </td>
                      <td data-label="Status">
                        <span className={statusClass}>{prenatalStatusLabel(status)}</span>
                      </td>
                      {canEdit && (
                        <td data-label="Actions">
                          <button
                            type="button"
                            onClick={() => void handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            className="btn-danger"
                          >
                            {deletingId === c.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add checkup */}
        {canEdit && (
          !showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              + Add {activeTrimester} trimester checkup
            </button>
          ) : (
            <form
              onSubmit={handleAdd}
              style={{
                background: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginTop: grouped[activeTrimester].length > 0 ? '0.5rem' : 0,
              }}
            >
              <h3
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: '0.875rem',
                }}
              >
                New {activeTrimester} Trimester Checkup
              </h3>

              {error && (
                <div className="alert-error mb-4" role="alert">{error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">                <div>
                  <span className="form-label">Scheduled Checkup Date</span>
                  <div className="form-input bg-surface-alt" style={{ color: 'var(--ink-secondary)' }}>
                    {scheduledDates[activeTrimester] ?? 'No schedule set'}
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="blood-pressure">Blood Pressure</label>
                  <input
                    id="blood-pressure"
                    type="text"
                    value={form.blood_pressure}
                    onChange={(e) => setForm((p) => ({ ...p, blood_pressure: e.target.value }))}
                    placeholder="e.g. 120/80"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="weight">Weight (kg)</label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
                  className="form-input"
                  style={{ maxWidth: '160px' }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label" htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  <span className="btn-label">{saving ? 'Saving…' : 'Save Checkup'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}
