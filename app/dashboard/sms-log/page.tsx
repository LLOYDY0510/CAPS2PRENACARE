import { createClient } from '@/utils/supabase/server';
import SmsLogTable, { type SmsLogRow } from '@/components/schedule/SmsLogTable';

export const dynamic = 'force-dynamic';

export default async function SmsLogPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('sms_logs')
    .select('id, recipient_count, message, status, error_message, created_at, sent_by, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  const rows: SmsLogRow[] = (logs ?? []).map((log) => {
    const sender = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
    return {
      id: log.id,
      recipient_count: log.recipient_count,
      message: log.message,
      status: log.status as 'success' | 'failed',
      error_message: log.error_message,
      created_at: log.created_at,
      sender: sender?.full_name || sender?.email || null,
    };
  });

  return (
    <div>
      <div className="page-header">
        <h1>SMS Log</h1>
        <p className="page-date">History of prenatal schedule reminders sent.</p>
      </div>

      <SmsLogTable logs={rows} />
    </div>
  );
}
