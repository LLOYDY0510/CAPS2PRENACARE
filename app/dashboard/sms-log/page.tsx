import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SmsLogPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('sms_logs')
    .select('id, recipient_count, message, status, error_message, created_at, sent_by, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">SMS Log</h1>
      <p className="text-muted mb-6">History of prenatal schedule reminders sent.</p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-left text-muted">
            <tr>
              <th className="px-4 py-3">Date &amp; Time</th>
              <th className="px-4 py-3">Sent By</th>
              <th className="px-4 py-3">Recipients</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-2">
                  No SMS sent yet.
                </td>
              </tr>
            )}
            {logs?.map((log) => (
              <tr key={log.id} className="border-b last:border-0 align-top">
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {new Date(log.created_at).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {(() => {
                    const sender = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                    return sender?.full_name || sender?.email || '—';
                  })()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{log.recipient_count}</td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="line-clamp-2 text-ink">{log.message}</p>
                  {log.status === 'failed' && log.error_message && (
                    <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}