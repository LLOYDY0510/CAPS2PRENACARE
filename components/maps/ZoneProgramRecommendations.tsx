'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ClipboardCheck, Info, RefreshCw, Send, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { addDays, localDate } from '@/utils/calendar';
import { ASSESSMENT_PROGRAMS, type ZoneProgram, type ZoneProgramSummary } from '@/utils/programs/types';

export default function ZoneProgramRecommendations({ canManage }: { canManage: boolean }) {
  const [summary, setSummary] = useState<ZoneProgramSummary | null>(null);
  const [zone, setZone] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selection, setSelection] = useState<{ row: ZoneProgram; mode: 'details' | 'send' | 'assessment' } | null>(null);
  const [count, setCount] = useState('0');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(localDate());
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/zone-programs', { cache: 'no-store', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Recommendations could not be loaded.');
      if (!Array.isArray(data.zones) || !Array.isArray(data.recommendations)) throw new Error('Recommendations could not be loaded.');
      if (!controller.signal.aborted) setSummary(data);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Recommendations could not be loaded.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const startup = setTimeout(() => { void refresh(); }, 0);
    return () => { clearTimeout(startup); request.current?.abort(); };
  }, [refresh]);

  function openAssessment(row: ZoneProgram) {
    setCount(String(row.identified_count ?? 0));
    setNote(row.note ?? '');
    setDate(row.assessed_on && row.assessed_on >= (addDays(localDate(), -90) ?? '') ? row.assessed_on : localDate());
    setError('');
    setSelection({ row, mode: 'assessment' });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || selection.mode === 'details' || busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setSuccess('');
    const { row, mode } = selection;
    try {
      const response = await fetch('/api/zone-programs', {
        method: mode === 'assessment' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'assessment'
          ? { zone: row.zone, programId: row.program_id, count: Number(count), note, date }
          : { zone: row.zone, programId: row.program_id, revision: row.revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'The action could not be completed.');
      setSelection(null);
      setSuccess(mode === 'assessment' ? `Zone ${row.zone} assessment saved.`
        : data.alreadySent ? `This program was already sent to ${data.recipients} patient accounts this month.`
          : `${data.created} in-app notifications sent to Zone ${row.zone}.`);
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The action could not be completed.');
    } finally { busy.current = false; setPending(false); }
  }

  const rows = summary?.recommendations.filter(row => (!zone || row.zone === zone) && (showAll || row.eligible || row.campaign_id)) ?? [];
  const selected = selection?.row;
  const inputClass = 'mt-2 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-950 focus-visible:outline-2 focus-visible:outline-green-700';

  function statusLabel(row: ZoneProgram) {
    if (row.campaign_id) return `Sent to ${row.recipient_count} this month`;
    if (row.eligible) return row.reachable ? 'Ready for review' : 'No active patient accounts';
    if (!ASSESSMENT_PROGRAMS.has(row.program_id)) return 'Trigger not met';
    if (row.identified_count === 0 && row.assessed_on && row.assessed_on >= (addDays(localDate(), -90) ?? '')) return 'No needs identified';
    return 'Assessment needed';
  }

  return <section className="card p-5 sm:p-6 space-y-5" aria-labelledby="zone-program-heading">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="section-icon" aria-hidden="true"><Sparkles size={22} /></span>
        <div><h2 id="zone-program-heading" className="text-xl font-bold text-neutral-950">Zone Program Recommendations</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">Programs suggested from registrations, care records, and staff assessments. Counts guide group planning, not individual care.</p></div>
      </div>
      <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} disabled={loading || pending} onClick={() => void refresh()}>Refresh programs</Button>
    </div>
    <div className="flex flex-wrap items-end gap-4">
      <label className="block text-sm font-semibold text-neutral-800">Zone
        <select className={inputClass} value={zone} onChange={event => setZone(event.target.value)}>
          <option value="">All permitted zones</option>{summary?.zones.map(item => <option key={item.zone} value={item.zone}>Zone {item.zone} · {item.registered} mothers</option>)}
        </select>
      </label>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-neutral-700"><input type="checkbox" className="h-5 w-5 accent-green-800" checked={showAll} onChange={event => setShowAll(event.target.checked)} />Show all programs and assessment needs</label>
    </div>
    {success && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-900">{success}</p>}
    {error && !selection && <p role="alert" className="error-message">{error}</p>}
    {loading && <p role="status" className="text-sm text-neutral-600">Updating program recommendations…</p>}
    <div className="overflow-x-auto" aria-busy={loading}>
      <table className="data-table"><caption className="sr-only">Zone program recommendations and notifications</caption>
        <thead><tr><th>Zone</th><th>Registered Mothers</th><th>Recommended Program</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{rows.map(row => <tr key={`${row.zone}:${row.program_id}`}>
          <td className="whitespace-nowrap font-semibold">Zone {row.zone}</td><td className="tabular-nums">{row.registered}</td>
          <td className="min-w-56 font-medium">{row.title}</td><td className="min-w-60 max-w-sm text-sm">{row.reason}</td>
          <td className="whitespace-nowrap text-sm">{statusLabel(row)}</td>
          <td className="min-w-48"><div className="flex w-max flex-nowrap gap-2">
            <Button type="button" size="sm" variant="outline" leftIcon={<Info size={15} />} onClick={() => { setError(''); setSelection({ row, mode: 'details' }); }}>Details</Button>
            {canManage && <Button type="button" size="sm" leftIcon={<Send size={15} />} disabled={pending || loading || !row.eligible || !!row.campaign_id || !row.reachable} onClick={() => { setError(''); setSelection({ row, mode: 'send' }); }}>Send</Button>}
          </div></td>
        </tr>)}{!loading && !rows.length && <tr><td colSpan={6} className="py-8 text-center text-neutral-600">No programs currently match the selected zones. Select “Show all programs” to review assessment needs.</td></tr>}</tbody>
      </table>
    </div>
    <p className="text-xs leading-5 text-neutral-600">In-app notifications only · One manual campaign per zone/program each month · Mothers without a linked active patient account cannot receive an in-app notice.</p>
    {summary && <p className="text-xs text-neutral-500">Updated {new Date(summary.computedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>}

    <Modal isOpen={!!selection} onClose={() => { if (!busy.current) setSelection(null); }} title={selection?.mode === 'assessment' ? 'Record zone needs assessment' : selection?.mode === 'send' ? 'Send program notification' : 'Program details'} maxWidth="lg">
      {selected && <form className="space-y-5 p-5 sm:p-6 max-h-[75dvh] overflow-y-auto" onSubmit={submit}>
        <div><p className="text-sm font-semibold text-green-800">Zone {selected.zone} · {selected.registered} registered mothers</p><h3 className="mt-2 text-lg font-bold">{selected.title}</h3></div>
        {error && <p role="alert" className="error-message">{error}</p>}
        {selection?.mode === 'assessment' ? <fieldset disabled={pending} className="space-y-4">
          <p className="text-sm text-neutral-600">Record education or service needs identified by staff. This does not diagnose individual mothers. Zero clears the current need.</p>
          <label className="block text-sm font-semibold">Number of mothers identified<input className={inputClass} type="number" min={0} max={selected.registered} step={1} required value={count} onChange={event => setCount(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Assessment date<input className={inputClass} type="date" min={addDays(localDate(), -90) ?? undefined} max={localDate()} required value={date} onChange={event => setDate(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Assessment source and notes<textarea className={inputClass} required minLength={5} maxLength={500} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Describe the assessment source without listing patient names." /></label>
        </fieldset> : <>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-6"><p className="font-semibold">Why this program</p><p>{selected.reason}</p><p className="mt-2">{selected.registered - selected.known_age} missing ages · {selected.unknown_date} missing registration dates. Counts include registry records regardless of map coordinates.</p></div>
          <div><h4 className="text-sm font-semibold">Program activities</h4><p className="mt-2 text-sm leading-6 text-neutral-700">{selected.activities}</p></div>
          {selection?.mode === 'send' ? <>
            <p className="text-sm font-semibold">{selected.reachable} patient accounts will receive this notice. {selected.registered - selected.reachable} records have no linked active account.</p>
            <div className="whitespace-pre-wrap rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6">{selected.announcement}</div>
            <p className="text-sm text-neutral-600">This announces a recommendation, not a scheduled event. Sending creates in-app notifications only.</p>
          </> : <>
            {selected.assessed_on && <p className="text-sm text-neutral-700">Assessment: {selected.assessed_on} · {selected.identified_count} needs recorded.<br />{selected.note}</p>}
            <p className="text-sm text-neutral-600">Group-planning defaults: 3 adolescent records, or 20% among at least 10 recorded ages; 2 high-risk records; 3 mothers with overdue/missed visits; 10 registrations for outreach. Other programs need a current assessment (within 90 days).</p>
            {canManage && ASSESSMENT_PROGRAMS.has(selected.program_id) && <Button type="button" variant="outline" leftIcon={<ClipboardCheck size={16} />} onClick={() => openAssessment(selected)}>Record assessment</Button>}
            {selected.sent_at && <p className="text-sm text-green-900">Last sent: {new Date(selected.sent_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.</p>}
          </>}
        </>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
          <Button data-cancel type="button" variant="outline" disabled={pending} onClick={() => setSelection(null)}>{selection?.mode === 'details' ? 'Close' : 'Cancel'}</Button>
          {selection?.mode !== 'details' && <Button type="submit" isLoading={pending} disabled={pending || (selection?.mode === 'send' && (!selected.eligible || !!selected.campaign_id || !selected.reachable))} leftIcon={<Send size={16} />}>{selection?.mode === 'assessment' ? 'Save assessment' : 'Confirm Send'}</Button>}
        </div>
      </form>}
    </Modal>
  </section>;
}
