'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type History = { id: string; condition: string; details: string | null; diagnosed_date: string | null; resolved_date: string | null; created_at: string };
type Referral = { id: string; referred_to: string; reason: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; referred_at: string; follow_up_date: string | null; outcome: string | null; updated_at: string };

export default function MaternalCarePanel({
  motherId,
  canEdit,
  initialHistory,
  initialReferrals,
}: { motherId: string; canEdit: boolean; initialHistory: History[]; initialReferrals: Referral[] }) {
  const supabase = createClient();
  const [history, setHistory] = useState(initialHistory);
  const [referrals, setReferrals] = useState(initialReferrals);
  const [condition, setCondition] = useState('');
  const [details, setDetails] = useState('');
  const [referredTo, setReferredTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function addHistory() {
    setError('');
    if (!condition.trim()) { setError('A health condition is required.'); return; }
    const { data, error: insertError } = await supabase.from('maternal_health_history').insert({ pregnant_mother_id: motherId, condition: condition.trim(), details: details.trim() || null }).select('id, condition, details, diagnosed_date, resolved_date, created_at').single();
    if (insertError) { setError(insertError.message); return; }
    if (data) setHistory((current) => [data as History, ...current]);
    setCondition(''); setDetails('');
  }

  async function addReferral() {
    setError('');
    if (!referredTo.trim() || !reason.trim()) { setError('Referral destination and reason are required.'); return; }
    const { data, error: insertError } = await supabase.from('maternal_referrals').insert({ pregnant_mother_id: motherId, referred_to: referredTo.trim(), reason: reason.trim() }).select('id, referred_to, reason, status, referred_at, follow_up_date, outcome, updated_at').single();
    if (insertError) { setError(insertError.message); return; }
    if (data) setReferrals((current) => [data as Referral, ...current]);
    setReferredTo(''); setReason('');
  }

  async function updateReferral(id: string, status: Referral['status']) {
    const { data, error: updateError } = await supabase.from('maternal_referrals').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('id, referred_to, reason, status, referred_at, follow_up_date, outcome, updated_at').single();
    if (updateError) { setError(updateError.message); return; }
    if (data) setReferrals((current) => current.map((item) => item.id === id ? data as Referral : item));
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Maternal Health History</h2>
        {history.length === 0 ? <p className="text-sm text-muted mt-2">No history recorded.</p> : <div className="space-y-2 mt-3">{history.map((item) => <div key={item.id} className="border rounded-lg p-3"><p className="font-medium text-sm">{item.condition}</p>{item.details && <p className="text-sm text-muted mt-1">{item.details}</p>}</div>)}</div>}
        {canEdit && <div className="grid gap-2 mt-4"><input className="form-input" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Condition or prior pregnancy history" /><textarea className="form-textarea" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details, treatment, or outcome" rows={2} /><button type="button" className="btn-secondary w-fit" onClick={addHistory}>Add health history</button></div>}
      </div>
      <div>
        <h2 className="text-lg font-semibold">High-Risk Referrals</h2>
        {referrals.length === 0 ? <p className="text-sm text-muted mt-2">No referrals recorded.</p> : <div className="space-y-2 mt-3">{referrals.map((item) => <div key={item.id} className="border rounded-lg p-3 flex flex-wrap items-center gap-3"><div className="flex-1 min-w-[220px]"><p className="font-medium text-sm">{item.referred_to}</p><p className="text-sm text-muted">{item.reason}</p></div><select className="form-select" value={item.status} disabled={!canEdit} onChange={(e) => updateReferral(item.id, e.target.value as Referral['status'])}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>)}</div>}
        {canEdit && <div className="grid gap-2 mt-4"><input className="form-input" value={referredTo} onChange={(e) => setReferredTo(e.target.value)} placeholder="Referral facility or provider" /><textarea className="form-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for referral" rows={2} /><button type="button" className="btn-secondary w-fit" onClick={addReferral}>Create referral</button></div>}
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
    </div>
  );
}