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
  const [checkups, setCheckups] = useState(initialCheckups);
  const [activeTrimester, setActiveTrimester] = useState<'1st' | '2nd' | '3rd'>('1st');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    checkup_date: '',
    blood_pressure: '',
    weight_kg: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4">Prenatal Checkups</h2>

      {/* Trimester tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {TRIMESTERS.map((tri) => (
          <button
            key={tri}
            onClick={() => {
              setActiveTrimester(tri);
              setShowForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTrimester === tri
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-gray-700'
            }`}
          >
            {tri} Trimester
            <span className="ml-1.5 text-xs text-muted-2">
              ({grouped[tri]?.length ?? 0})
            </span>
          </button>
        ))}
      </div>

      {/* Checkup list for active trimester */}
      <div className="space-y-2 mb-4">
        {grouped[activeTrimester].length === 0 && (
          <p className="text-sm text-muted-2 py-4 text-center">
            No checkups recorded for the {activeTrimester} trimester yet.
          </p>
        )}
        {grouped[activeTrimester].map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between border rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{c.checkup_date}</p>
              <p className="text-xs text-muted mt-0.5">
                {c.blood_pressure ? `BP: ${c.blood_pressure}` : ''}
                {c.weight_kg ? ` · Weight: ${c.weight_kg}kg` : ''}
              </p>
              {c.notes && <p className="text-xs text-muted mt-1">{c.notes}</p>}
            </div>
                      {canEdit && (
              <button
                onClick={() => handleDelete(c.id)}
                className="text-red-500 hover:underline text-xs"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add checkup form */}  
            {/* Add checkup form */}
      {canEdit && (!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-brand hover:underline"
        >
          + Add {activeTrimester} trimester checkup
        </button>
      ) : (
        <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Checkup Date</label>
              <input
                type="date"
                value={form.checkup_date}
                onChange={(e) => setForm((p) => ({ ...p, checkup_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Blood Pressure</label>
              <input
                type="text"
                value={form.blood_pressure}
                onChange={(e) => setForm((p) => ({ ...p, blood_pressure: e.target.value }))}
                placeholder="e.g. 120/80"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Checkup'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-lg text-sm border hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}