'use client';

import Modal from '@/components/ui/Modal';
import {useConfirmation} from '@/components/ui/useConfirmation';
import SectionHeading from '@/components/ui/SectionHeading';
import { Leaf, Clock3, CircleCheckBig, Send, Plus, Settings2, Pencil, Save, Check } from 'lucide-react';
import { localDate } from '@/utils/calendar';

import { useRef, useState } from 'react';
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
  const actionPending=useRef(false);
  const [busy,setBusy]=useState(false);
  async function runAction(action:()=>Promise<void>){
    if(actionPending.current)return;actionPending.current=true;setBusy(true);
    try{await action();}catch{setMessageError(true);setMessage('The operation could not be completed. Please try again.');}
    finally{actionPending.current=false;setBusy(false);setGenerating(false);}
  }
  const router = useRouter();

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState('');
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError,setMessageError]=useState(false);
  const {confirm,confirmation}=useConfirmation();
  async function closeTemplates(){if(actionPending.current)return;const original=monthlyTips.find(t=>t.id===editingTemplateId);if(original&&templateDraft!==original.content&&!await confirm({title:'Discard template changes?',description:'Your unsaved message will be lost.',confirmText:'Discard Changes'}))return;setEditingTemplateId(null);setShowTemplates(false);}
  const [showTemplates, setShowTemplates] = useState(false);

  const pending = broadcasts.filter((b) => b.status === 'pending');
  const approved = broadcasts.filter((b) => b.status === 'approved');
  const sent = broadcasts.filter((b) => b.status === 'sent');

  function recipientsFor(broadcastId: string) {
    return recipients.filter((r) => r.broadcast_id === broadcastId);
  }

  async function handleGenerate() {
    return runAction(async()=>{
    setGenerating(true);
    setMessage('');setMessageError(false);

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
        setMessageError(true);setMessage(insertError.message); setGenerating(false); return;
      }

      if (broadcast) {
        const {error:recipientError}=await supabase.from('tip_broadcast_recipients').insert(
          mothers.map((m) => ({
            broadcast_id: broadcast.id,
            pregnant_mother_id: m.id,
          }))
        );
        if(recipientError)throw new Error(recipientError.message);
        createdCount++;
      }
    }

    setGenerating(false);
    setMessage(
      `Generated ${createdCount} message batch(es) for this month.` +
        (skippedCount > 0 ? ` ${skippedCount} already existed for this period.` : '')
    );
    router.refresh();
    });
  }

  async function saveTemplate(tip: MonthlyTip) {
    return runAction(async()=>{
    const {error:failure}=await supabase
      .from('monthly_tips')
      .update({ content: templateDraft })
      .eq('id', tip.id);
    if(failure){setMessageError(true);setMessage(failure.message);return;}
    setMessage('');setEditingTemplateId(null);
    router.refresh();
    });
  }

  async function saveBroadcastEdit(broadcast: Broadcast) {
    return runAction(async()=>{
    const {error:failure}=await supabase
      .from('tip_broadcasts')
      .update({ content: broadcastDraft })
      .eq('id', broadcast.id);
    if(failure){setMessageError(true);setMessage(failure.message);return;}
    setMessage('');setEditingBroadcastId(null);
    router.refresh();
    });
  }

  async function approveBroadcast(broadcast: Broadcast) {
    return runAction(async()=>{
    const response = await fetch('/api/broadcasts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastId: broadcast.id }),
    });
    if (!response.ok) { setMessageError(true);setMessage('The broadcast could not be approved.'); return; }

    router.refresh();
    });
  }

  async function sendBroadcast(broadcast: Broadcast) {
    return runAction(async()=>{
    const response = await fetch('/api/notifications/dispatch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'health_tip', broadcastId: broadcast.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessageError(true);setMessage(result.error ?? 'Dispatch failed; the broadcast remains approved.'); return; }
    setMessageError(false);setMessage(`Dispatched ${result.created ?? 0} recipient notices.`);

    router.refresh();
    });
  }

  return <section className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4"><SectionHeading title="Monthly Nutrition & Health Tips" icon={Leaf}/><div className="flex gap-3"><button disabled={busy} className="btn-secondary" onClick={()=>setShowTemplates(true)}><Settings2 size={16} aria-hidden="true"/>Manage Templates</button><button disabled={busy} className="btn-primary" onClick={handleGenerate}><Plus size={16} aria-hidden="true"/>{generating?'Generating…':'Generate Pending Tips'}</button></div></div>
    {confirmation}{message&&<p role={messageError?"alert":"status"} className={messageError?"error-message":""}>{message}</p>}
    <Modal isOpen={showTemplates} onClose={()=>void closeTemplates()} title="Manage Templates" maxWidth="xl">{messageError&&message&&<p role="alert" className="error-message">{message}</p>}<div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Month</th><th>Risk</th><th>Title</th><th>Message</th><th>Action</th></tr></thead><tbody>{monthlyTips.map(tip=><tr key={tip.id}><td>{tip.month}</td><td>{tip.risk_level}</td><td>{tip.title}</td><td>{editingTemplateId===tip.id?<textarea aria-label="Template message" value={templateDraft} onChange={e=>setTemplateDraft(e.target.value)}/>:tip.content}</td><td>{editingTemplateId===tip.id?<><button disabled={busy} onClick={()=>saveTemplate(tip)} className="action-link"><Save size={15} aria-hidden="true"/>Save</button><button disabled={busy} onClick={()=>setEditingTemplateId(null)}>Cancel</button></>:<button disabled={busy} onClick={()=>{setEditingTemplateId(tip.id);setTemplateDraft(tip.content);}}>Edit</button>}</td></tr>)}</tbody></table></div></Modal>
    <div className="grid lg:grid-cols-2 gap-6">{[{title:'Pending Review',rows:pending},{title:'Approved and Ready to Send',rows:approved},{title:'Sent',rows:sent}].map((group,index)=><section key={group.title} className={`card p-5 ${index===2?'lg:col-span-2':''}`}>
      <SectionHeading title={group.title} icon={index===0?Clock3:index===1?CircleCheckBig:Send}/><div className={`overflow-auto ${index<2?'h-96':''}`}><table className="data-table"><thead><tr><th>Month / Period</th><th>Risk Group</th><th>Message</th><th>Recipients</th><th>Timestamp</th><th>Actions</th></tr></thead><tbody>{group.rows.map(b=><tr key={b.id}><td>{b.month} / {b.period}</td><td>{b.risk_level}</td><td className="min-w-64">{editingBroadcastId===b.id?<><textarea aria-label="Broadcast message" value={broadcastDraft} onChange={e=>setBroadcastDraft(e.target.value)}/><button disabled={busy} onClick={()=>saveBroadcastEdit(b)} className="action-link"><Save size={15} aria-hidden="true"/>Save</button><button disabled={busy} onClick={()=>setEditingBroadcastId(null)}>Cancel</button></>:b.content}</td><td><details><summary>{recipientsFor(b.id).length} recipients</summary>{recipientsFor(b.id).map(r=><p key={r.pregnant_mother_id}>{r.pregnant_mothers?.full_name??'Unknown'}</p>)}</details></td><td>{b.sent_at??b.approved_at??b.created_at}</td><td>{b.status!=='sent'&&<div className="flex flex-col gap-2"><button disabled={busy} className="btn-secondary" onClick={()=>{setEditingBroadcastId(b.id);setBroadcastDraft(b.content);}}><Pencil size={15} aria-hidden="true"/>Edit Message</button>{b.status==='pending'?<button disabled={busy} className="btn-primary" onClick={()=>approveBroadcast(b)}><Check size={15} aria-hidden="true"/>Approve</button>:<button disabled={busy} className="btn-primary" onClick={()=>sendBroadcast(b)}><Send size={15} aria-hidden="true"/>Send Now</button>}</div>}{b.status==='sent'&&'In-app notices sent'}</td></tr>)}{!group.rows.length&&<tr><td colSpan={6}>No messages.</td></tr>}</tbody></table></div>
    </section>)}</div></section>;
}
