'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
 
type Schedule = {
  id: string;
  visit_date: string;
  reminder_sent: boolean;
} | null;
 
type Mother = {
  id: string;
  full_name: string | null;
  purok: string | null;
  contact_number: string | null;
};
 
export default function ScheduleSetter({
  currentSchedule,
  mothers,
}: {
  currentSchedule: Schedule;
  mothers: Mother[];
}) {
  const supabase = createClient();
  const router = useRouter();
 
  const [visitDate, setVisitDate] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
 
  const withContact = mothers.filter((m) => m.contact_number);
 
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
 
  function toggleAll() {
    if (selected.size === withContact.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(withContact.map((m) => m.id)));
    }
  }
 
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
 
    if (!visitDate) {
      setError('Please select a date.');
      return;
    }
    if (selected.size === 0) {
      setError('Select at least one pregnant mother.');
      return;
    }
 
    setSaving(true);
 
    const {
      data: { user },
    } = await supabase.auth.getUser();
 
    const { data: schedule, error: insertError } = await supabase
      .from('prenatal_schedules')
      .insert({
        visit_date: visitDate,
        set_by: user?.id ?? null,
      })
      .select()
      .single();
 
    if (insertError || !schedule) {
      setError(insertError?.message ?? 'Failed to set schedule.');
      setSaving(false);
      return;
    }
 
    const { error: recipientsError } = await supabase
      .from('prenatal_schedule_recipients')
      .insert(
        Array.from(selected).map((pregnant_mother_id) => ({
          schedule_id: schedule.id,
          pregnant_mother_id,
        }))
      );
 
    setSaving(false);
 
    if (recipientsError) {
      setError(recipientsError.message);
      return;
    }
 
    setVisitDate('');
    setSelected(new Set());
    router.refresh();
  }
 
  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
                   Reminder will be sent automatically one day before
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-2">No schedule has been set yet.</p>
        )}
      </div>
 
      {/* Set schedule + select recipients */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
 
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Set Next Prenatal Schedule</h2>
          <p className="text-xs text-muted-2 mb-4">
            A reminder SMS will be sent automatically to the selected pregnant women one day
            before this date — no further action needed.
          </p>
          <div className="max-w-xs">
            <label className="block text-sm font-medium mb-1">Visit Date</label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
 
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <p className="text-sm font-medium">
              Select recipients ({selected.size}/{withContact.length})
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-brand hover:underline"
            >
              {selected.size === withContact.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
 
          <div className="max-h-[420px] overflow-y-auto">
            {withContact.length === 0 && (
              <p className="px-4 py-8 text-center text-muted-2 text-sm">
                No pregnant mothers with a contact number found.
              </p>
            )}
            {withContact.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{m.full_name}</p>
                  <p className="text-muted text-xs">
                    Zone {m.purok ?? '—'} · {m.contact_number}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
 
        <button
          type="submit"
          disabled={saving}
          className="bg-brand text-white px-5 py-2 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : `Set Schedule (${selected.size} recipients)`}
        </button>
      </form>
    </div>
  );
}