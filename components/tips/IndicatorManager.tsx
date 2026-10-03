'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Activity, Plus, Edit, Trash2, Power } from 'lucide-react';

type Indicator = {
  id: string;
  label: string;
  indicator_type: string;
  threshold_value: number | null;
  active: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  checklist: 'Checklist (BHW ticks manually)',
  age_below: 'Auto: Age below threshold',
  first_pregnancy_age_above: 'Auto: First pregnancy + age above threshold',
};

export default function IndicatorManager({
  initialIndicators,
}: {
  initialIndicators: Indicator[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState('checklist');
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!label.trim()) {
      setError('Label is required.');
      return;
    }
    if (type !== 'checklist' && !threshold) {
      setError('Threshold value is required for this type.');
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from('risk_indicators').insert({
      label: label.trim(),
      indicator_type: type,
      threshold_value: type === 'checklist' ? null : parseFloat(threshold),
      active: true,
      created_by: user?.id ?? null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setLabel('');
    setType('checklist');
    setThreshold('');
    setShowForm(false);
    router.refresh();
  }

  async function toggleActive(indicator: Indicator) {
    await supabase
      .from('risk_indicators')
      .update({ active: !indicator.active })
      .eq('id', indicator.id);
    router.refresh();
  }

  async function saveLabel(indicator: Indicator) {
    if (!editLabel.trim()) return;
    await supabase.from('risk_indicators').update({ label: editLabel.trim() }).eq('id', indicator.id);
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this indicator? This cannot be undone.');
    if (!confirmed) return;
    await supabase.from('risk_indicators').delete().eq('id', id);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity size={20} className="text-[var(--brand)]" />
            <span>Configured Risk Indicators</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage risk rules and clinical checklists</p>
        </div>
        <Button
          variant={showForm ? 'outline' : 'primary'}
          size="sm"
          onClick={() => setShowForm((s) => !s)}
          leftIcon={showForm ? undefined : <Plus size={16} />}
        >
          {showForm ? 'Cancel' : 'Add Indicator'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Risk Indicator Protocol</h3>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <Input
            label="Label / Description"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. History of 3 or more miscarriages"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Evaluation Method / Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: 'checklist', label: 'Checklist (BHW ticks manually)' },
                { value: 'age_below', label: 'Auto: Age below threshold' },
                { value: 'first_pregnancy_age_above', label: 'Auto: First pregnancy + age above threshold' },
              ]}
            />
            {type !== 'checklist' && (
              <Input
                label="Threshold (Age in years)"
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 19"
              />
            )}
          </div>

          <div className="pt-2">
            <Button type="submit" isLoading={saving}>
              Save Indicator
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {initialIndicators.length === 0 && (
          <p className="text-xs text-slate-400 font-medium py-8 text-center">No indicators configured yet.</p>
        )}
        {initialIndicators.map((ind) => (
          <div
            key={ind.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
              !ind.active ? 'opacity-50 bg-slate-50 border-slate-200/60' : 'bg-white border-slate-100 hover:border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex-1 min-w-0">
              {editingId === ind.id ? (
                <div className="flex items-center gap-2">
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <Button size="sm" onClick={() => saveLabel(ind)}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-bold text-slate-800">{ind.label}</p>
              )}
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {TYPE_LABELS[ind.indicator_type] ?? ind.indicator_type}
                {ind.threshold_value != null ? ` · Threshold: ${ind.threshold_value} yrs` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setEditingId(ind.id); setEditLabel(ind.label); }}
                leftIcon={<Edit size={14} />}
              >
                Edit
              </Button>
              <Button
                variant={ind.active ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => toggleActive(ind)}
                leftIcon={<Power size={14} />}
              >
                {ind.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(ind.id)}
                leftIcon={<Trash2 size={14} />}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
