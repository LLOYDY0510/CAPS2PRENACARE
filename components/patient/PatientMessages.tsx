import { createClient } from '@/utils/supabase/server';
import { Bell, MessageSquare, ShieldCheck, HeartHandshake, Sparkles } from 'lucide-react';
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
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader title="Patient Portal" icon={HeartHandshake} />
        <div className="rounded-[16px] bg-white border border-[var(--border-light)] p-8 shadow-card text-center">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-2">Record Not Found</h2>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
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
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Welcome to Prenatrack"
        subtitle="Your personalized maternal health update center"
        icon={HeartHandshake}
        badge="Patient Portal"
      />

      {/* Patient Profile Card */}
      <div className="rounded-[16px] bg-gradient-to-r from-[var(--brand-light)] via-white to-[var(--accent-light)] border border-[var(--brand-subtle)] p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] text-white text-xl font-bold flex items-center justify-center shadow-xs shrink-0">
            {fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--ink)]">{fullName}</h1>
            <p className="text-xs font-mono font-medium text-[var(--muted)] mt-0.5">
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
        <div className="rounded-[16px] bg-white border border-[var(--border-light)] p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[var(--brand)]" />
              <h2 className="text-base font-bold text-[var(--ink)]">System Notifications</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-light)] text-[var(--brand-dark)] border border-[var(--brand-subtle)]">
              {notifications?.length ?? 0}
            </span>
          </div>

          {!notifications || notifications.length === 0 ? (
            <p className="text-xs text-[var(--muted-2)] text-center py-8">No system notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl p-4 bg-[var(--surface-alt)] border border-[var(--border-light)] hover:border-[var(--brand-subtle)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--brand-dark)]">{notification.title}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[var(--muted)] border border-[var(--border-light)]">
                      {notification.email_status === 'sent' ? 'Email Sent' : 'In App'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-secondary)] mt-1.5 leading-relaxed">{notification.message}</p>
                  <p className="text-[10px] text-[var(--muted-2)] mt-2 font-medium">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health Tips & Broadcast Messages Card */}
        <div className="rounded-[16px] bg-white border border-[var(--border-light)] p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--accent)]" />
              <h2 className="text-base font-bold text-[var(--ink)]">Health &amp; Nutrition Tips</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-light)] text-[var(--accent-dark)] border border-[var(--accent-subtle)]">
              {messages.length} tips
            </span>
          </div>

          {messages.length === 0 ? (
            <p className="text-xs text-[var(--muted-2)] text-center py-8">No nutrition or health tip broadcasts sent yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded-xl p-4 bg-[var(--accent-light)]/40 border border-[var(--accent-subtle)]/70 hover:bg-[var(--accent-light)]/70 transition-colors">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-dark)] mb-1">
                    <MessageSquare size={14} />
                    <span>{m.title}</span>
                  </div>
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">{m.content}</p>
                  {m.sent_at && (
                    <p className="text-[10px] text-[var(--muted)] mt-2 font-medium">
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