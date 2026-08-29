'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
 
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
  pregnant_mothers: { full_name: string } | { full_name: string }[] | null;
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
      .update({ content: templateDraft, updated_at: new Date().toISOString() })
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
 
    router.refresh();
  }
 
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Monthly Nutrition & Health Tips
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplates((s) => !s)}
            className="text-sm text-brand hover:underline"
          >
            {showTemplates ? 'Hide Templates' : 'Manage Templates'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-brand text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50"
          >
            {generating ? 'Generating...' : "Generate This Month's Messages"}
          </button>
        </div>
      </div>
 
      {message && (
        <p className="text-sm text-brand bg-brand-light/40 p-2 rounded mb-4">{message}</p>
      )}
 
      {/* Templates editor */}
      {showTemplates && (
        <div className="mb-6 border rounded-lg divide-y">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((month) => {
            const low = monthlyTips.find((t) => t.month === month && t.risk_level === 'low');
            const high = monthlyTips.find((t) => t.month === month && t.risk_level === 'high');
            return (
              <div key={month} className="p-4">
                <p className="text-sm font-semibold mb-2">Month {month}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[low, high].map(
                    (tip) =>
                      tip && (
                        <div key={tip.id} className="border rounded-lg p-3">
                          <p
                            className={`text-xs font-medium mb-1 ${
                              tip.risk_level === 'high' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {tip.risk_level === 'high' ? '⚠️ High Risk' : '✅ Low Risk'}
                          </p>
                          {editingTemplateId === tip.id ? (
                            <>
                              <textarea
                                value={templateDraft}
                                onChange={(e) => setTemplateDraft(e.target.value)}
                                rows={4}
                                className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => saveTemplate(tip)}
                                  className="text-xs bg-brand text-white px-3 py-1 rounded-lg hover:bg-brand-dark"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingTemplateId(null)}
                                  className="text-xs border px-3 py-1 rounded-lg hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-muted">{tip.content}</p>
                              <button
                                onClick={() => {
                                  setEditingTemplateId(tip.id);
                                  setTemplateDraft(tip.content);
                                }}
                                className="text-xs text-brand hover:underline mt-2"
                              >
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
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Pending Review ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-2">No messages waiting for review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => {
              const recs = recipientsFor(b.id);
              return (
                <div key={b.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">
                      Month {b.month} —{' '}
                      <span className={b.risk_level === 'high' ? 'text-red-600' : 'text-green-600'}>
                        {b.risk_level === 'high' ? 'High Risk' : 'Low Risk'}
                      </span>
                    </p>
                    <span className="text-xs text-muted-2">{recs.length} recipient(s)</span>
                  </div>
 
                  {editingBroadcastId === b.id ? (
                    <>
                      <textarea
                        value={broadcastDraft}
                        onChange={(e) => setBroadcastDraft(e.target.value)}
                        rows={3}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveBroadcastEdit(b)}
                          className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark"
                        >
                          Save Edit
                        </button>
                        <button
                          onClick={() => setEditingBroadcastId(null)}
                          className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700 mb-2">{b.content}</p>
                  )}
 
                  <details className="text-xs text-muted mt-2">
                    <summary className="cursor-pointer hover:text-gray-700">
                      View recipient list
                    </summary>
                    <ul className="mt-1 list-disc list-inside">
                      {recs.map((r) => (
                        <li key={r.pregnant_mother_id}>
                          {(Array.isArray(r.pregnant_mothers)
                            ? r.pregnant_mothers[0]?.full_name
                            : r.pregnant_mothers?.full_name) ?? 'Unknown'}
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
                        className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50"
                      >
                        Edit Message
                      </button>
                      <button
                        onClick={() => approveBroadcast(b)}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                      >
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
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Approved — Ready to Send ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <p className="text-sm text-muted-2">No approved messages waiting to be sent.</p>
        ) : (
          <div className="space-y-2">
            {approved.map((b) => {
              const recs = recipientsFor(b.id);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between border rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Month {b.month} —{' '}
                      <span className={b.risk_level === 'high' ? 'text-red-600' : 'text-green-600'}>
                        {b.risk_level === 'high' ? 'High Risk' : 'Low Risk'}
                      </span>{' '}
                      <span className="text-xs text-muted-2">({recs.length} recipients)</span>
                    </p>
                  </div>
                  <button
                    onClick={() => sendBroadcast(b)}
                    className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark"
                  >
                    Send Now (Simulated SMS)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
 
      {/* Sent history */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Sent ({sent.length})
        </h3>
        {sent.length === 0 ? (
          <p className="text-sm text-muted-2">No messages sent yet.</p>
        ) : (
          <div className="space-y-1">
            {sent.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between text-xs text-muted border-b last:border-0 py-2"
              >
                <span>
                  Month {b.month} — {b.risk_level === 'high' ? 'High Risk' : 'Low Risk'} (
                  {recipientsFor(b.id).length} recipients)
                </span>
                <span>{b.sent_at ? new Date(b.sent_at).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
 