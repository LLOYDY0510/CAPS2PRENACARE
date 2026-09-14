import { createClient } from '@/utils/supabase/server';

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
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2 text-ink">Record not found</h1>
        <p className="text-muted text-sm">
          We couldn&apos;t find your linked record. Please contact your BHW or midwife for help.
        </p>
      </div>
    );
  }

  const fullName = [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="card p-5">
        <h1 className="text-xl font-semibold text-ink">{fullName}</h1>
        <p className="text-sm text-muted mt-0.5">{record.serial_no}</p>
        <div className="mt-3">
          {record.risk_level === 'high' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
              High Risk
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Low Risk
            </span>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Messages ({messages.length})</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-2">No nutrition or health tip messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="border rounded-lg p-3">
                <p className="text-xs font-medium text-brand mb-1">{m.title}</p>
                <p className="text-sm text-gray-700">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}