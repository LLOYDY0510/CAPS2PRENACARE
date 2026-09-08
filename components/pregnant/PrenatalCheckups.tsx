'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type Checkup = {
  id: string;
  trimester: '1st' | '2nd' | '3rd';
  checkup_date: string;
  blood_pressure: string | null;
  weight_kg: number | null;
  notes: string | null;
};

const TRIMESTERS: ('1st' | '2nd' | '3rd')[] = ['1st', '2nd', '3rd'];

export default function PrenatalCheckups({
  motherId,
  initialCheckups,
  canEdit = true,
}: {
  motherId: string;
  initialCheckups: Checkup[];
  canEdit?: boolean;
}) {
  const supabase = createClient();
  const [checkups, setCheckups]           = useState(initialCheckups);
  const [activeTrimester, setActiveTrimester] = useState<'1st' | '2nd' | '3rd'>('1st');
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ checkup_date: '', blood_pressure: '', weight_kg: '', notes: '' });
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  const grouped = TRIMESTERS.reduce((acc, tri) => {
    acc[tri] = checkups
      .filter((c) => c.trimester === tri)
      .sort((a, b) => a.checkup_date.localeCompare(b.checkup_date));
    return acc;
  }, {} as Record<string, Checkup[]>);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.checkup_date) {
      setError('Checkup date is required.');
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from('prenatal_checkups')
      .insert({
        pregnant_mother_id: motherId,
        trimester: activeTrimester,
        checkup_date: form.checkup_date,
        blood_pressure: form.blood_pressure || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        notes: form.notes || null,
        recorded_by: user?.id ?? null,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCheckups((prev) => [...prev, data as Checkup]);
    setForm({ checkup_date: '', blood_pressure: '', weight_kg: '', notes: '' });
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this checkup record?');
    if (!confirmed) return;

    await supabase.from('prenatal_checkups').delete().eq('id', id);
    setCheckups((prev) => prev.filter((c) => c.id !== id));
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
                  <th>Date</th>
                  <th>Blood Pressure</th>
                  <th>Weight (kg)</th>
                  <th>Notes</th>
                  {canEdit && <th style={{ width: '60px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {grouped[activeTrimester].map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{c.checkup_date}</td>
                    <td>{c.blood_pressure ?? '—'}</td>
                    <td>{c.weight_kg != null ? `${c.weight_kg} kg` : '—'}</td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'normal' }}>{c.notes ?? '—'}</td>
                    {canEdit && (
                      <td>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
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

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="form-label" htmlFor="checkup-date">Checkup Date</label>
                  <input
                    id="checkup-date"
                    type="date"
                    value={form.checkup_date}
                    onChange={(e) => setForm((p) => ({ ...p, checkup_date: e.target.value }))}
                    className="form-input"
                  />
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving…' : 'Save Checkup'}
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
