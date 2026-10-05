import { createClient } from '@/utils/supabase/server';
import { Bell, MessageSquare, HeartHandshake, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import RiskBadge from '@/components/ui/RiskBadge';

export default async function PatientMessages({
  pregnantMotherId,
}: {
  pregnantMotherId: string;
}) {
  const supabase = await createClient();

  const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('serial_no, first_name, middle_name, last_name, risk_level')
    .eq('id', pregnantMotherId)
    .single();

  const { data: recipientRows } = await supabase
    .from('tip_broadcast_recipients')
    .select('id, tip_broadcasts(id, title, content, status, sent_at)')
    .eq('pregnant_mother_id', pregnantMotherId);

  const { data: notifications } = await supabase
    .from('maternal_notifications')
    .select('id, title, message, category, email_status, read_at, created_at')
    .eq('pregnant_mother_id', pregnantMotherId)
    .order('created_at', { ascending: false })
    .limit(30);

  const messages = (recipientRows ?? [])
    .map((r) => {
      const b = Array.isArray(r.tip_broadcasts) ? r.tip_broadcasts[0] : r.tip_broadcasts;
      if (!b || b.status !== 'sent') return null;
      return { id: b.id, title: b.title, content: b.content, sent_at: b.sent_at };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => (b.sent_at ?? '').localeCompare(a.sent_at ?? ''));

  if (!record) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 anim-fade-up">
        <PageHeader title="Patient Portal" icon={HeartHandshake} />
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Record Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            We couldn&apos;t find your linked prenatal record. Please contact your BHW or midwife to verify your registration.
          </p>
        </div>
      </div>
    );
  }

  const fullName = [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-5xl mx-auto space-y-6 anim-fade-up">
      <PageHeader
        title="Welcome to Prenatrack"
        subtitle="Your personalized maternal health update center"
        icon={HeartHandshake}
        badge="Patient Portal"
      />

      {/* Patient Profile Banner */}
      <div className="bg-gradient-to-r from-teal-500/10 via-teal-50/50 to-indigo-50/40 border border-teal-200/60 rounded-[28px] p-6 sm:p-7 shadow-xl shadow-teal-700/5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--brand)] text-white text-2xl font-bold flex items-center justify-center shadow-md shadow-teal-700/20 shrink-0">
            {fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{fullName}</h1>
            <p className="text-xs font-mono font-semibold text-slate-500 mt-1">
              Record Serial: {record.serial_no}
            </p>
          </div>
        </div>
        <div>
          <RiskBadge riskLevel={record.risk_level} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Notifications Card */}
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-[var(--brand)]" />
              <h2 className="text-base font-bold text-slate-900">System Notifications</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-[var(--brand)] border border-teal-200/60">
              {notifications?.length ?? 0}
            </span>
          </div>

          {!notifications || notifications.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium text-center py-8">No system notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl p-4 bg-slate-50/80 border border-slate-100 hover:border-teal-200 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--brand-dark)]">{notification.title}</p>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200/80">
                      {notification.email_status === 'sent' ? 'Email Sent' : 'In App'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">{notification.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health Tips & Broadcast Messages Card */}
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Health &amp; Nutrition Tips</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {messages.length} tips
            </span>
          </div>

          {messages.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium text-center py-8">No nutrition or health tip broadcasts sent yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded-2xl p-4 bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
                    <MessageSquare size={14} className="text-indigo-600" />
                    <span>{m.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{m.content}</p>
                  {m.sent_at && (
                    <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                      Received: {new Date(m.sent_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}