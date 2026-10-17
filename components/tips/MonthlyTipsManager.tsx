'use client';

import { localDate } from '@/utils/calendar';

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
  return localDate().slice(0, 7);
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
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') { skippedCount++; continue; }
        setMessage(insertError.message); setGenerating(false); return;
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
    const response = await fetch('/api/broadcasts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastId: broadcast.id }),
    });
    if (!response.ok) { setMessage('The broadcast could not be approved.'); return; }

    router.refresh();
  }

  async function sendBroadcast(broadcast: Broadcast) {
    const response = await fetch('/api/notifications/dispatch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'health_tip', broadcastId: broadcast.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.error ?? 'Dispatch failed; the broadcast remains approved.'); return; }
    setMessage(`Dispatched ${result.created ?? 0} recipient notices.`);

    router.refresh();
  }

  return <section className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4"><h2 className="text-lg font-bold">Monthly Nutrition &amp; Health Tips</h2><div className="flex gap-3"><button className="btn-secondary" onClick={()=>setShowTemplates(!showTemplates)}>{showTemplates?'Hide Templates':'Manage Templates'}</button><button className="btn-primary" disabled={generating} onClick={handleGenerate}>{generating?'Generating…':'Generate Pending Tips'}</button></div></div>
    {message&&<p role="status">{message}</p>}
    {showTemplates&&<div className="card p-6 overflow-x-auto"><table className="data-table"><thead><tr><th>Month</th><th>Risk</th><th>Title</th><th>Message</th><th>Action</th></tr></thead><tbody>{monthlyTips.map(tip=><tr key={tip.id}><td>{tip.month}</td><td>{tip.risk_level}</td><td>{tip.title}</td><td>{editingTemplateId===tip.id?<textarea aria-label="Template message" value={templateDraft} onChange={e=>setTemplateDraft(e.target.value)}/>:tip.content}</td><td>{editingTemplateId===tip.id?<><button onClick={()=>saveTemplate(tip)}>Save</button><button onClick={()=>setEditingTemplateId(null)}>Cancel</button></>:<button onClick={()=>{setEditingTemplateId(tip.id);setTemplateDraft(tip.content);}}>Edit</button>}</td></tr>)}</tbody></table></div>}
    <div className="grid lg:grid-cols-2 gap-6">{[{title:'Pending Review',rows:pending},{title:'Approved and Ready to Send',rows:approved},{title:'Sent',rows:sent}].map((group,index)=><section key={group.title} className={`card p-5 ${index===2?'lg:col-span-2':''}`}>
      <h3 className="font-bold mb-4">{group.title}</h3><div className={`overflow-auto ${index<2?'h-96':''}`}><table className="data-table"><thead><tr><th>Month / Period</th><th>Risk Group</th><th>Message</th><th>Recipients</th><th>Timestamp</th><th>Actions</th></tr></thead><tbody>{group.rows.map(b=><tr key={b.id}><td>{b.month} / {b.period}</td><td>{b.risk_level}</td><td className="min-w-64">{editingBroadcastId===b.id?<><textarea aria-label="Broadcast message" value={broadcastDraft} onChange={e=>setBroadcastDraft(e.target.value)}/><button onClick={()=>saveBroadcastEdit(b)}>Save</button><button onClick={()=>setEditingBroadcastId(null)}>Cancel</button></>:b.content}</td><td><details><summary>{recipientsFor(b.id).length} recipients</summary>{recipientsFor(b.id).map(r=><p key={r.pregnant_mother_id}>{r.pregnant_mothers?.full_name??'Unknown'}</p>)}</details></td><td>{b.sent_at??b.approved_at??b.created_at}</td><td>{b.status!=='sent'&&<div className="flex flex-col gap-2"><button className="btn-secondary" onClick={()=>{setEditingBroadcastId(b.id);setBroadcastDraft(b.content);}}>Edit Message</button>{b.status==='pending'?<button className="btn-primary" onClick={()=>approveBroadcast(b)}>Approve</button>:<button className="btn-primary" onClick={()=>sendBroadcast(b)}>Send Now</button>}</div>}{b.status==='sent'&&'In-app notices sent'}</td></tr>)}{!group.rows.length&&<tr><td colSpan={6}>No messages.</td></tr>}</tbody></table></div>
    </section>)}</div></section>;
}
