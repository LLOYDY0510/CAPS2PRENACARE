'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
 
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
 
  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this indicator? This cannot be undone.');
    if (!confirmed) return;
    await supabase.from('risk_indicators').delete().eq('id', id);
    router.refresh();
  }
 
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">High-Risk Indicators</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm text-brand hover:underline"
        >
          {showForm ? 'Cancel' : '+ Add Indicator'}
        </button>
      </div>
 
      {showForm && (
        <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-gray-50 mb-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
 
          <div>
            <label className="block text-xs font-medium mb-1">Label / Description</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. History of 3 or more miscarriages"
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
 
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="checklist">Checklist (BHW ticks manually)</option>
                <option value="age_below">Auto: Age below threshold</option>
                <option value="first_pregnancy_age_above">
                  Auto: First pregnancy + age above threshold
                </option>
              </select>
            </div>
            {type !== 'checklist' && (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Threshold (age in years)
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="e.g. 19"
                  className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            )}
          </div>
 
          <button
            type="submit"
            disabled={saving}
            className="bg-brand text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Indicator'}
          </button>
        </form>
      )}
 
      <div className="space-y-2">
        {initialIndicators.length === 0 && (
          <p className="text-sm text-muted-2 py-4 text-center">No indicators configured yet.</p>
        )}
        {initialIndicators.map((ind) => (
          <div
            key={ind.id}
            className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
              !ind.active ? 'opacity-50' : ''
            }`}
          >
            <div>
              <p className="text-sm font-medium">{ind.label}</p>
              <p className="text-xs text-muted-2 mt-0.5">
                {TYPE_LABELS[ind.indicator_type] ?? ind.indicator_type}
                {ind.threshold_value != null ? ` · Threshold: ${ind.threshold_value}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleActive(ind)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  ind.active
                    ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                    : 'text-green-600 border-green-200 hover:bg-green-50'
                }`}
              >
                {ind.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleDelete(ind.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
 