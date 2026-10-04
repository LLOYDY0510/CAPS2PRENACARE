'use client';

import { useState } from 'react';
import { getPrenatalVisitStatus, prenatalStatusLabel } from '@/utils/prenatalStatus';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/ToastAlert';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';

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
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-[var(--brand)]" />
            <span>Prenatal Checkup History</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Trimester progress and medical checkup records</p>
        </div>

        <Tabs
          variant="segmented"
          tabs={TRIMESTERS.map((tri) => ({
            id: tri,
            label: `${tri} Trimester`,
            count: grouped[tri]?.length ?? 0,
          }))}
          activeTab={activeTrimester}
          onChange={(id) => {
            setActiveTrimester(id as '1st' | '2nd' | '3rd');
            setShowForm(false);
          }}
        />
      </div>

      <div>
        {error && (
          <Alert type="error" className="mb-4" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {notice && !error && (
          <Alert type="success" className="mb-4" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}

        {/* Checkup table */}
        {grouped[activeTrimester].length === 0 ? (
          <p className="text-xs text-slate-400 font-medium text-center py-10">
            No checkups recorded for the {activeTrimester} trimester.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 mb-6">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Scheduled Date</th>
                  <th className="py-3.5 px-4">Actual Visit Date</th>
                  <th className="py-3.5 px-4">Blood Pressure</th>
                  <th className="py-3.5 px-4">Weight (kg)</th>
                  <th className="py-3.5 px-4">Clinical Notes</th>
                  <th className="py-3.5 px-4">Status</th>
                  {canEdit && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
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
                  const statusColor =
                    status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : status === 'missed'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {scheduledDates[c.trimester] ??
                          c.scheduled_checkup_date ??
                          c.scheduled_for ??
                          c.checkup_date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{c.actual_checkup_date ?? '—'}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{c.blood_pressure ?? '—'}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{c.weight_kg != null ? `${c.weight_kg} kg` : '—'}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium max-w-xs truncate">{c.notes ?? '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
                          {prenatalStatusLabel(status)}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            isLoading={deletingId === c.id}
                            onClick={() => void handleDelete(c.id)}
                            leftIcon={<Trash2 size={14} />}
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add checkup form */}
        {canEdit && (
          !showForm ? (
            <Button
              variant="secondary"
              onClick={() => setShowForm(true)}
              leftIcon={<Plus size={16} />}
            >
              Add {activeTrimester} Trimester Checkup
            </Button>
          ) : (
            <form
              onSubmit={handleAdd}
              className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-900">
                New {activeTrimester} Trimester Checkup Record
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Scheduled Checkup Date
                  </label>
                  <div className="h-11 px-4 flex items-center bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700">
                    {scheduledDates[activeTrimester] ?? 'No schedule set'}
                  </div>
                </div>
                <Input
                  label="Blood Pressure"
                  type="text"
                  value={form.blood_pressure}
                  onChange={(e) => setForm((p) => ({ ...p, blood_pressure: e.target.value }))}
                  placeholder="e.g. 120/80"
                />
              </div>

              <div className="w-full sm:w-1/2">
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
                  placeholder="Weight in kg"
                />
              </div>

              <Textarea
                label="Clinical Notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Doctor or midwife clinical notes..."
                className="min-h-[80px]"
              />

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" isLoading={saving}>
                  Save Checkup
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}
