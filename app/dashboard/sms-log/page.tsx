import SmsLogTable, { type SmsLogRow } from '@/components/schedule/SmsLogTable';
import { requireRoles } from '@/utils/auth/roles';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSmsSchemaCapabilities } from '@/utils/sms/schema';
import PageHeader from '@/components/ui/PageHeader';
import { Send } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SmsLogPage() {
  await requireRoles(['admin', 'bhw_head', 'bhw_purok', 'nurse']);

  const supabase = createAdminClient();
  const { hasReceipts } = await getSmsSchemaCapabilities();

  const { data: logs } = await supabase
    .from('sms_logs')
    .select(
      `id, recipient_count, recipient_numbers, recipient_mother_ids, message, message_type, status, delivery_status, error_message, created_at, sent_by${
        hasReceipts ? ', schedule_id, send_kind, semaphore_response' : ''
      }`,
    )
    .order('created_at', { ascending: false })
    .limit(200);

  type LogRow = {
    id: string;
    recipient_count: number;
    recipient_numbers: string[] | null;
    recipient_mother_ids: string[] | null;
    message: string;
    message_type: string;
    status: string;
    delivery_status: string;
    error_message: string | null;
    created_at: string;
    sent_by: string | null;
    send_kind?: string;
  };
  const logRows = (logs ?? []) as unknown as LogRow[];

  const logIds = logRows.map((log) => log.id);
  const { data: receipts } = hasReceipts && logIds.length
    ? await supabase
        .from('sms_recipient_receipts')
        .select('id, sms_log_id, pregnant_mother_id, contact_number, provider_message_id, provider_status, error_message')
        .in('sms_log_id', logIds)
    : { data: [] };

  type Receipt = {
    id: string;
    sms_log_id: string;
    pregnant_mother_id: string | null;
    contact_number: string;
    provider_message_id: string | null;
    provider_status: string;
    error_message: string | null;
  };
  const receiptsByLog = new Map<string, Receipt[]>();
  for (const receipt of (receipts ?? []) as Receipt[]) {
    const list = receiptsByLog.get(receipt.sms_log_id) ?? [];
    list.push(receipt);
    receiptsByLog.set(receipt.sms_log_id, list);
  }

  const recipientIds = Array.from(
    new Set(logRows.flatMap((log) => (log.recipient_mother_ids ?? []) as string[])),
  );
  const { data: recipientMothers } = recipientIds.length
    ? await supabase.from('pregnant_mothers').select('id, full_name, contact_number').in('id', recipientIds)
    : { data: [] };
  const mothersById = new Map((recipientMothers ?? []).map((mother) => [mother.id, mother]));

  const senderIds = Array.from(new Set(logRows.map((log) => log.sent_by).filter((v): v is string => !!v)));
  const { data: senders } = senderIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', senderIds)
    : { data: [] };
  const senderById = new Map((senders ?? []).map((s) => [s.id, s]));

  const { data: followUps } = await supabase
    .from('prenatal_follow_ups')
    .select('id, pregnant_mother_id, reason, status, sms_status, created_at')
    .in('status', ['pending', 'contacted', 'unreachable'])
    .order('created_at', { ascending: false });
  const followUpMotherIds = new Set((followUps ?? []).map((item) => item.pregnant_mother_id as string));

  const { data: highRiskMothers } = await supabase
    .from('pregnant_mothers')
    .select('id, full_name, contact_number, risk_level')
    .eq('risk_level', 'high');
  (highRiskMothers ?? []).forEach((mother) => mothersById.set(mother.id, mother));

  const rows: SmsLogRow[] = logRows.map((log) => {
    const sender = log.sent_by ? senderById.get(log.sent_by) : null;
    const logReceipts = receiptsByLog.get(log.id) ?? [];
    return {
      id: log.id,
      recipient_count: log.recipient_count,
      recipients:
        (log.recipient_mother_ids ?? [])
          .map((id: string) => mothersById.get(id)?.full_name ?? id)
          .join(', ') ||
        (log.recipient_numbers ?? []).join(', ') ||
        '—',
      message: log.message,
      message_type: (log.message_type ?? 'general') as SmsLogRow['message_type'],
      status: log.status as 'success' | 'failed',
      delivery_status: (log.delivery_status ?? 'unknown') as SmsLogRow['delivery_status'],
      error_message: log.error_message,
      created_at: log.created_at,
      sender: sender?.full_name || sender?.email || null,
      send_kind: (log.send_kind ?? 'manual') as SmsLogRow['send_kind'],
      receipts: logReceipts.map((receipt) => ({
        motherName: receipt.pregnant_mother_id
          ? (mothersById.get(receipt.pregnant_mother_id)?.full_name ?? 'Unknown')
          : null,
        contactNumber: receipt.contact_number,
        providerStatus: receipt.provider_status,
        providerMessageId: receipt.provider_message_id,
        errorMessage: receipt.error_message,
      })),
    };
  });

  type FollowUpDisplay = {
    id: string;
    motherId: string;
    motherName: string;
    contactNumber: string | null;
    reason: string;
    status: string;
    messageType: 'missed_visit_follow_up' | 'risk_alert';
  };

  const followUpRows: FollowUpDisplay[] = (followUps ?? []).map((item) => ({
    id: item.id,
    motherId: item.pregnant_mother_id as string,
    motherName: mothersById.get(item.pregnant_mother_id as string)?.full_name ?? 'Pregnant mother',
    contactNumber: mothersById.get(item.pregnant_mother_id as string)?.contact_number ?? null,
    reason: item.reason,
    status: item.status,
    messageType: 'missed_visit_follow_up' as const,
  }));

  (highRiskMothers ?? [])
    .filter((mother) => mother.contact_number && !followUpMotherIds.has(mother.id))
    .forEach((mother) =>
      followUpRows.push({
        id: `risk-${mother.id}`,
        motherId: mother.id,
        motherName: mother.full_name ?? 'Pregnant mother',
        contactNumber: mother.contact_number,
        reason: 'High-risk case needs follow-up',
        status: 'pending',
        messageType: 'risk_alert' as const,
      }),
    );

  return (
    <div className="space-y-6 anim-fade-up">
      <PageHeader
        title="SMS Log &amp; Broadcast Dispatch"
        subtitle="Every message sent through Semaphore with live provider delivery receipts"
        icon={Send}
        badge="Messaging Log"
      />

      <SmsLogTable logs={rows} followUps={followUpRows} />
    </div>
  );
}
