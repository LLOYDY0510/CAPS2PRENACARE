'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
 
type Schedule = {
  id: string;
  visit_date: string;
  reminder_sent: boolean;
} | null;
 
export default function ScheduleSetter({ currentSchedule }: { currentSchedule: Schedule }) {
  const supabase = createClient();
  const router = useRouter();
 
  const [visitDate, setVisitDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
 
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
 
    if (!visitDate) {
      setError('Please select a date.');
      return;
    }
 
    setSaving(true);
 
    const {
      data: { user },
    } = await supabase.auth.getUser();
 
    const { error: insertError } = await supabase.from('prenatal_schedules').insert({
      visit_date: visitDate,
      set_by: user?.id ?? null,
    });
 
    setSaving(false);
 
    if (insertError) {
      setError(insertError.message);
      return;
    }
 
    setVisitDate('');
    router.refresh();
  }
 
  return (
    <div className="max-w-lg space-y-6">
      {/* Current schedule status */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Prenatal Schedule</h2>
        {currentSchedule ? (
          <div>
            <p className="text-2xl font-semibold text-ink">{currentSchedule.visit_date}</p>
            <p className="text-sm text-muted mt-2">
              {currentSchedule.reminder_sent ? (
                <span className="text-green-600">✅ Reminder already sent</span>
              ) : (
                <span className="text-amber-600">
                  ⏳ Reminder will be sent automatically one day before
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-2">No schedule has been set yet.</p>
        )}
      </div>
 
      {/* Set / update schedule */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Set Next Prenatal Schedule</h2>
        <p className="text-xs text-muted-2">
          This applies to all registered pregnant women. A reminder SMS will be sent
          automatically to everyone one day before this date — no further action needed.
        </p>
 
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
 
        <div>
          <label className="block text-sm font-medium mb-1">Visit Date</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
 
        <button
          type="submit"
          disabled={saving}
          className="bg-brand text-white px-5 py-2 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : 'Set Schedule'}
        </button>
      </form>
    </div>
  );
}