'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Sparkles, FileEdit, Check, Send, Clock, Loader2 } from 'lucide-react';
 
type MonthlyTip = {
  id: string;
  month: number;
  risk_level: 'low' | 'high';
  title: string;
  content: string;
};
 
type Mother = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  risk_level: string | null;
  lmp: string | null;
};
 
type Broadcast = {
  id: string;
  month: number;
  risk_level: 'low' | 'high';
  period: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'sent';
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
};
 
type Recipient = {
  broadcast_id: string;
  pregnant_mother_id: string;
  sent: boolean;
  pregnant_mothers: { full_name: string } | null;
};
 
function calcPregnancyMonth(lmp: string | null): number | null {
  if (!lmp) return null;
  const lmpDate = new Date(lmp);
  if (isNaN(lmpDate.getTime())) return null;
  const days = Math.floor((Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  const month = Math.floor(days / 30) + 1;
  if (month < 1 || month > 9) return null;
  return month;
}
 
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
 
export default function MonthlyTipsManager({
  monthlyTips,
  pregnantMothers,
  broadcasts,
  recipients,
}: {
  monthlyTips: MonthlyTip[];
  pregnantMothers: Mother[];
  broadcasts: Broadcast[];
  recipients: Recipient[];
}) {
  const supabase = createClient();
  const router = useRouter();
 
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState('');
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
 
  const pending = broadcasts.filter((b) => b.status === 'pending');
  const approved = broadcasts.filter((b) => b.status === 'approved');
  const sent = broadcasts.filter((b) => b.status === 'sent');
 
  function recipientsFor(broadcastId: string) {
    return recipients.filter((r) => r.broadcast_id === broadcastId);
  }
 
  async function handleGenerate() {
    setGenerating(true);
    setMessage('');
 
    const period = currentPeriod();
 
    // Group mothers by (month, risk_level)
    const groups: Record<string, Mother[]> = {};
    pregnantMothers.forEach((m) => {
      const month = calcPregnancyMonth(m.lmp);
      if (!month) return;
      const risk = m.risk_level === 'high' ? 'high' : 'low';
      const key = `${month}-${risk}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
 
    let createdCount = 0;
    let skippedCount = 0;
 
    for (const key of Object.keys(groups)) {
      const [monthStr, risk] = key.split('-');
      const month = parseInt(monthStr);
      const mothers = groups[key];
 
      const template = monthlyTips.find(
        (t) => t.month === month && t.risk_level === risk
      );
      if (!template) continue;
 
      const { data: broadcast, error: insertError } = await supabase
        .from('tip_broadcasts')
        .insert({
          month,
          risk_level: risk,
          period,
          title: template.title,
          content: template.content,
          status: 'pending',
        })
        .select()
        .single();
 
      if (insertError) {
        // Likely already generated this month (unique constraint) — skip quietly
        skippedCount++;
        continue;
      }
 
      if (broadcast) {
        await supabase.from('tip_broadcast_recipients').insert(
          mothers.map((m) => ({
            broadcast_id: broadcast.id,
            pregnant_mother_id: m.id,
          }))
        );
        createdCount++;
      }
    }
 
    setGenerating(false);
    setMessage(
      `Generated ${createdCount} message batch(es) for this month.` +
        (skippedCount > 0 ? ` ${skippedCount} already existed for this period.` : '')
    );
    router.refresh();
  }
 
  async function saveTemplate(tip: MonthlyTip) {
    await supabase
      .from('monthly_tips')
      .update({ content: templateDraft })
      .eq('id', tip.id);
    setEditingTemplateId(null);
    router.refresh();
  }
 
  async function saveBroadcastEdit(broadcast: Broadcast) {
    await supabase
      .from('tip_broadcasts')
      .update({ content: broadcastDraft })
      .eq('id', broadcast.id);
    setEditingBroadcastId(null);
    router.refresh();
  }
 
  async function approveBroadcast(broadcast: Broadcast) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
 
    await supabase
      .from('tip_broadcasts')
      .update({
        status: 'approved',
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', broadcast.id);
    router.refresh();
  }
 
  async function sendBroadcast(broadcast: Broadcast) {
    await supabase
      .from('tip_broadcasts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', broadcast.id);
 
    await supabase
      .from('tip_broadcast_recipients')
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('broadcast_id', broadcast.id);

    await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'health_tip', broadcastId: broadcast.id }),
    });
 
    router.refresh();
  }
 
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">
          Monthly Nutrition & Health Tips
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplates((s) => !s)}
            className={showTemplates ? 'btn-ghost' : 'btn-secondary'}
          >
            {showTemplates ? 'Hide Templates' : 'Manage Templates'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate This Month&apos;s Messages
              </>
            )}
          </button>
        </div>
      </div>
 
      {message && (
        <div className="bg-teal-50 text-teal-700 p-3 rounded-2xl text-sm font-medium mb-4">
          {message}
        </div>
      )}
 
      {/* Templates editor */}
      {showTemplates && (
        <div className="mb-6 border border-slate-200/60 rounded-2xl divide-y divide-slate-200/60">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((month) => {
            const low = monthlyTips.find((t) => t.month === month && t.risk_level === 'low');
            const high = monthlyTips.find((t) => t.month === month && t.risk_level === 'high');
            return (
              <div key={month} className="p-4">
                <p className="text-sm font-bold text-slate-800 mb-3">Month {month}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[low, high].map(
                    (tip) =>
                      tip && (
                        <div key={tip.id} className="border border-slate-200/60 rounded-2xl p-3">
                          <p
                            className={`text-xs font-semibold mb-2 ${
                              tip.risk_level === 'high' ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {tip.risk_level === 'high' ? 'High Risk' : 'Low Risk'}
                          </p>
                          {editingTemplateId === tip.id ? (
                            <>
                              <textarea
                                value={templateDraft}
                                onChange={(e) => setTemplateDraft(e.target.value)}
                                rows={4}
                                className="form-textarea w-full"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => saveTemplate(tip)}
                                  className="btn-primary"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingTemplateId(null)}
                                  className="btn-secondary"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-slate-600">{tip.content}</p>
                              <button
                                onClick={() => {
                                  setEditingTemplateId(tip.id);
                                  setTemplateDraft(tip.content);
                                }}
                                className="btn-ghost mt-2"
                              >
                                <FileEdit size={12} className="mr-1" />
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                      )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
 
      {/* Pending review */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
          Pending Review ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">No messages waiting for review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => {
              const recs = recipientsFor(b.id);
              return (
                <div key={b.id} className="border border-slate-200/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Month {b.month} —{' '}
                      <span className={b.risk_level === 'high' ? 'text-red-600' : 'text-emerald-600'}>
                        {b.risk_level === 'high' ? 'High Risk' : 'Low Risk'}
                      </span>
                    </p>
                    <span className="text-xs text-slate-400">{recs.length} recipient(s)</span>
                  </div>
 
                  {editingBroadcastId === b.id ? (
                    <>
                      <textarea
                        value={broadcastDraft}
                        onChange={(e) => setBroadcastDraft(e.target.value)}
                        rows={3}
                        className="form-textarea w-full"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveBroadcastEdit(b)}
                          className="btn-primary"
                        >
                          Save Edit
                        </button>
                        <button
                          onClick={() => setEditingBroadcastId(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-700 mb-2">{b.content}</p>
                  )}
 
                  <details className="text-xs text-slate-500 mt-2">
                    <summary className="cursor-pointer hover:text-slate-700">
                      View recipient list
                    </summary>
                    <ul className="mt-1 list-disc list-inside">
                      {recs.map((r) => (
                        <li key={r.pregnant_mother_id}>
                          {r.pregnant_mothers?.full_name ?? 'Unknown'}
                        </li>
                      ))}
                    </ul>
                  </details>
 
                  {editingBroadcastId !== b.id && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          setEditingBroadcastId(b.id);
                          setBroadcastDraft(b.content);
                        }}
                        className="btn-secondary"
                      >
                        <FileEdit size={12} className="mr-1" />
                        Edit Message
                      </button>
                      <button
                        onClick={() => approveBroadcast(b)}
                        className="btn-primary"
                      >
                        <Check size={12} className="mr-1" />
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
 
      {/* Approved, ready to send */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
          Approved — Ready to Send ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <p className="text-sm text-slate-400">No approved messages waiting to be sent.</p>
        ) : (
          <div className="space-y-2">
            {approved.map((b) => {
              const recs = recipientsFor(b.id);
              return (
                <div key={b.id} className="border border-slate-200/60 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      Month {b.month} —{' '}
                      <span className={b.risk_level === 'high' ? 'text-red-600' : 'text-emerald-600'}>
                        {b.risk_level === 'high' ? 'High Risk' : 'Low Risk'}
                      </span>{' '}
                      <span className="text-xs text-slate-400">({recs.length} recipients)</span>
                    </p>
                    <button
                      onClick={() => sendBroadcast(b)}
                      className="btn-primary"
                    >
                      <Send size={12} className="mr-1" />
                      Send Now
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {recs
                      .map(
                        (r) =>
                          (Array.isArray(r.pregnant_mothers)
                            ? r.pregnant_mothers[0]?.full_name
                            : r.pregnant_mothers?.full_name) ?? 'Unknown'
                      )
                      .join(', ')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
 
      {/* Sent history */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
          Sent ({sent.length})
        </h3>
        {sent.length === 0 ? (
          <p className="text-sm text-slate-400">No messages sent yet.</p>
        ) : (
          <div className="space-y-2">
            {sent.map((b) => {
              const recs = recipientsFor(b.id);
              return (
                <div key={b.id} className="text-xs border-b border-slate-200/60 last:border-0 py-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>
                      Month {b.month} — {b.risk_level === 'high' ? 'High Risk' : 'Low Risk'} (
                      {recs.length} recipients)
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {b.sent_at ? new Date(b.sent_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">
                    {recs
                      .map(
                        (r) =>
                          (Array.isArray(r.pregnant_mothers)
                            ? r.pregnant_mothers[0]?.full_name
                            : r.pregnant_mothers?.full_name) ?? 'Unknown'
                      )
                      .join(', ')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
