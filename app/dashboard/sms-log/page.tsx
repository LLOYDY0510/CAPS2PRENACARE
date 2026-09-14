import { createClient } from '@/utils/supabase/server';
import SmsLogTable, { type SmsLogRow } from '@/components/schedule/SmsLogTable';
import { requireRoles } from '@/utils/auth/roles';

export const dynamic = 'force-dynamic';

export default async function SmsLogPage() {
  const { supabase } = await requireRoles(['admin', 'bhw_head', 'bhw_purok', 'nurse']);

  const { data: logs } = await supabase
    .from('sms_logs')
    .select('id, recipient_count, recipient_numbers, recipient_mother_ids, message, message_type, status, delivery_status, error_message, created_at, sent_by, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  const recipientIds = Array.from(new Set((logs ?? []).flatMap((log) => log.recipient_mother_ids ?? [])));
  const { data: recipientMothers } = recipientIds.length
    ? await supabase.from('pregnant_mothers').select('id, full_name, contact_number').in('id', recipientIds)
    : { data: [] };
  const mothersById = new Map((recipientMothers ?? []).map((mother) => [mother.id, mother]));

  const { data: followUps } = await supabase
    .from('prenatal_follow_ups')
    .select('id, pregnant_mother_id, reason, status, sms_status, created_at')
    .in('status', ['pending', 'contacted', 'unreachable'])
    .order('created_at', { ascending: false });
  const followUpMotherIds = new Set((followUps ?? []).map((item) => item.pregnant_mother_id));
  const { data: highRiskMothers } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, contact_number, risk_level')
    .eq('risk_level', 'high')
    .not('contact_number', 'is', null);
  (highRiskMothers ?? []).forEach((mother) => mothersById.set(mother.id, mother));

  const rows: SmsLogRow[] = (logs ?? []).map((log) => {
    const sender = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
    return {
      id: log.id,
      recipient_count: log.recipient_count,
      recipients: (log.recipient_mother_ids ?? []).map((id: string) => mothersById.get(id)?.full_name ?? id).join(', ') || (log.recipient_numbers ?? []).join(', ') || '—',
      message: log.message,
      message_type: (log.message_type ?? 'general') as SmsLogRow['message_type'],
      status: log.status as 'success' | 'failed',
      delivery_status: (log.delivery_status ?? 'unknown') as SmsLogRow['delivery_status'],
      error_message: log.error_message,
      created_at: log.created_at,
      sender: sender?.full_name || sender?.email || null,
    };
  });

  const followUpRows: {
    id: string;
    motherId: string;
    motherName: string;
    contactNumber: string | null;
    reason: string;
    status: string;
    messageType: 'missed_visit_follow_up' | 'risk_alert';
  }[] = (followUps ?? []).map((item) => ({
    id: item.id,
    motherId: item.pregnant_mother_id,
    motherName: mothersById.get(item.pregnant_mother_id)?.full_name ?? 'Pregnant mother',
    contactNumber: mothersById.get(item.pregnant_mother_id)?.contact_number ?? null,
    reason: item.reason,
    status: item.status,
    messageType: 'missed_visit_follow_up' as const,
  }));
  (highRiskMothers ?? []).forEach((mother) => {
    if (!followUpMotherIds.has(mother.id)) followUpRows.push({
      id: `risk-${mother.id}`,
      motherId: mother.id,
      motherName: mother.full_name ?? 'Pregnant mother',
      contactNumber: mother.contact_number,
      reason: 'High-risk case needs follow-up',
      status: 'pending',
      messageType: 'risk_alert' as const,
    });
  });

  return (
    <div>
      <div className="page-header">
        <h1>SMS Log</h1>
        <p className="page-date">Sent messages, recipients, message types, delivery status, and follow-up actions.</p>
      </div>

      <SmsLogTable logs={rows} followUps={followUpRows} />
    </div>
  );
}
