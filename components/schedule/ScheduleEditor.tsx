'use client';

import { localDate } from '@/utils/calendar';

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import SearchBar from '@/components/ui/SearchBar';
import { CalendarDays, Users, X } from 'lucide-react';

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
  visitNumber?: number;
  notes: string;
  motherIds: string[];
};

export default function ScheduleEditor({
  onDirtyChange,
  mothers,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
}: {
  onDirtyChange?: (dirty:boolean)=>void;
  mothers: ScheduleMother[];
  initial: ScheduleEditorValue;
  submitLabel: string;
  onSubmit: (value: ScheduleEditorValue) => Promise<boolean>;
  onCancel: () => void;
  busy: boolean;
}) {
  const pending=useRef(false);
  const [visitNumber,setVisitNumber]=useState(initial.visitNumber??0);
  const [visitDate, setVisitDate] = useState(initial.visitDate);
  const [trimester, setTrimester] = useState<Trimester>(initial.trimester);
  const [notes, setNotes] = useState(initial.notes);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial.motherIds));
  const [purokFilter, setPurokFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(()=>{onDirtyChange?.(visitNumber!==(initial.visitNumber??0)||visitDate!==initial.visitDate||trimester!==initial.trimester||notes!==initial.notes||selected.size!==initial.motherIds.length||initial.motherIds.some(id=>!selected.has(id)));},[visitNumber,visitDate,trimester,notes,selected,initial,onDirtyChange]);

  const puroks = useMemo(() => {
    const values = mothers.map((m) => m.purok).filter((p): p is string => !!p);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [mothers]);

  const visible = useMemo(() => {
    return mothers.filter((m) => {
      if (purokFilter !== 'all' && (m.purok ?? 'Unassigned') !== purokFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (m.full_name ?? '').toLowerCase();
        const contact = (m.contact_number ?? '').toLowerCase();
        if (!name.includes(q) && !contact.includes(q)) return false;
      }
      return true;
    });
  }, [mothers, purokFilter, searchQuery]);

  const selectedMothersList = useMemo(() => {
    return mothers.filter((m) => selected.has(m.id));
  }, [mothers, selected]);

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
    setSelected((prev) => {
      const allVisibleSelected = visible.every((m) => prev.has(m.id));
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((m) => next.delete(m.id));
      } else {
        visible.forEach((m) => next.add(m.id));
      }
      return next;
    });
  }

  function removeSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if(pending.current||busy)return;
    setError('');

    if(![1,2,3].includes(visitNumber)){setError('Choose 1st, 2nd or 3rd Visit.');return;}
    if (!visitDate) {
      setError('Choose the visit date.');
      return;
    }
    if (selected.size === 0) {
      setError('Assign at least one pregnant mother.');
      return;
    }

    const today = localDate();
    if (visitDate < today) {
      setError('The visit date cannot be in the past.');
      return;
    }

    pending.current=true;
    try{
      await onSubmit({visitDate,visitNumber,trimester,notes,motherIds:Array.from(selected)});
    }catch{setError('The schedule could not be saved. Please try again.');}
    finally{pending.current=false;}

  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div className="error-message p-4 rounded-2xl bg-green-50 border border-green-200 text-green-600 text-xs font-semibold" role="alert">
          {error}
        </div>
      )}

      {/* Visit details card */}
      <div className="bg-white rounded-[28px] border border-neutral-100 shadow-xl shadow-neutral-200/50 p-6 sm:p-7 space-y-4">
        <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <CalendarDays size={18} className="text-[var(--brand)]" />
          <span>Visit Schedule Details</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Trimester"
            value={trimester}
            onChange={(e) => setTrimester(e.target.value as Trimester)}
            options={[
              { value: '1st', label: '1st Trimester' },
              { value: '2nd', label: '2nd Trimester' },
              { value: '3rd', label: '3rd Trimester' },
            ]}
          />
          <Select label="Visits" value={String(visitNumber)} onChange={e=>setVisitNumber(Number(e.target.value))}
            options={[{value:'0',label:'Select Visit'},{value:'1',label:'1st Visit'},{value:'2',label:'2nd Visit'},{value:'3',label:'3rd Visit'}]}/>
          <Input
            label="Date"
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            required
          />
        <Input
          label="Notes for the team (Optional)"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Bring BP measurement equipment and laboratory receipts"
        />
        </div>
      </div>

      {/* Mother Picker Card */}
      <div className="bg-white rounded-[28px] border border-neutral-100 shadow-xl shadow-neutral-200/50 p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[var(--brand)]" />
            <h2 className="text-base font-bold text-neutral-900">
              Select Pregnant Mothers ({selected.size} selected)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {puroks.length > 0 && (
              <div className="w-36">
                <Select
                  value={purokFilter}
                  onChange={(e) => setPurokFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Puroks' },
                    ...puroks.map((p) => ({ value: p, label: `Zone ${p}` })),
                  ]}
                />
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
              {visible.every((m) => selected.has(m.id)) && visible.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search mother by name or contact number..."
        />

        {/* Selected Chips Bar */}
        {selectedMothersList.length > 0 && (
          <div className="space-y-2 bg-green-50/50 p-4 rounded-2xl border border-green-100">
            <p className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider">
              Selected Recipients ({selectedMothersList.length})
            </p>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pt-1">
              {selectedMothersList.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-[var(--brand-dark)] border border-green-200 shadow-xs"
                >
                  <span>{m.full_name ?? 'Unnamed'}</span>
                  <button
                    type="button"
                    onClick={() => removeSelected(m.id)}
                    className="hover:text-green-600 transition-colors p-0.5 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mothers Checklist */}
        <div className="max-h-[360px] overflow-y-auto rounded-2xl border border-neutral-100 divide-y divide-neutral-100">
          {visible.length === 0 && (
            <p className="p-8 text-center text-neutral-400 font-medium text-xs">
              No pregnant mothers match your search or filter.
            </p>
          )}
          {visible.map((mother) => {
            const isChecked = selected.has(mother.id);
            return (
              <label
                key={mother.id}
                className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors cursor-pointer ${
                  isChecked ? 'bg-green-50/40' : 'hover:bg-neutral-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(mother.id)}
                  className="rounded-md border-neutral-300 text-[var(--brand)] focus:ring-[var(--brand)] w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                    {mother.full_name ?? 'Unnamed mother'}
                  </p>
                  <p className="text-xs text-neutral-500 font-medium mt-0.5">
                    Zone {mother.purok ?? '—'} ·{' '}
                    {mother.contact_number ? (
                      mother.contact_number
                    ) : (
                      <span className="text-green-500 font-semibold">no contact number — no SMS</span>
                    )}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {withoutContact > 0 && (
          <p className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-500 bg-neutral-50 border border-neutral-100">
            {withoutContact} of the mothers shown have no contact number. They can still be scheduled, but SMS reminders won&apos;t reach them.
          </p>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" isLoading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
