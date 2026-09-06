import { createClient } from '@/utils/supabase/server';
 
export default async function PregnantMotherDashboard({
  pregnantMotherId,
}: {
  pregnantMotherId: string;
}) {
  const supabase = await createClient();
 
  const { data: record } = await supabase
    .from('pregnant_mothers')
    .select('*')
    .eq('id', pregnantMotherId)
    .single();
 
  const { data: checkups } = await supabase
    .from('prenatal_checkups')
    .select('id, trimester, checkup_date, blood_pressure, weight_kg, notes')
    .eq('pregnant_mother_id', pregnantMotherId)
    .order('checkup_date', { ascending: false });
 
  const { data: recipientRows } = await supabase
    .from('tip_broadcast_recipients')
    .select('id, tip_broadcasts(id, month, risk_level, title, content, status, sent_at)')
    .eq('pregnant_mother_id', pregnantMotherId);
 
  const tipMessages = (recipientRows ?? [])
    .map((r) => {
      const b = Array.isArray(r.tip_broadcasts) ? r.tip_broadcasts[0] : r.tip_broadcasts;
      if (!b || b.status !== 'sent') return null;
      return { id: b.id, title: b.title, content: b.content, sent_at: b.sent_at };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
 
  const { data: scheduleReminders } = await supabase
    .from('prenatal_schedule_reminders')
    .select('id, message, sent_at')
    .eq('pregnant_mother_id', pregnantMotherId);
 
  const reminderMessages = (scheduleReminders ?? []).map((r) => ({
    id: r.id,
    title: '📅 Prenatal Schedule Reminder',
    content: r.message,
    sent_at: r.sent_at,
  }));
 
  const messages = [...tipMessages, ...reminderMessages].sort((a, b) =>
    (b.sent_at ?? '').localeCompare(a.sent_at ?? '')
  );
 
  const { data: upcomingSchedule } = await supabase
    .from('prenatal_schedules')
    .select('visit_date')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
 
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
      {/* Header */}
      <div className="card p-5">
        <h1 className="text-xl font-semibold text-ink">{fullName}</h1>
        <p className="text-sm text-muted mt-0.5">{record.serial_no}</p>
        <div className="mt-3">
          {record.risk_level === 'high' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
              ⚠️ High Risk
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              ✅ Low Risk
            </span>
          )}
        </div>
      </div>
 
      {/* Messages */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          📩 Messages ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-2">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) =>
              m ? (
                <div key={m.id} className="border rounded-lg p-3">
                  <p className="text-xs font-medium text-brand mb-1">{m.title}</p>
                  <p className="text-sm text-gray-700">{m.content}</p>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
 
      {/* Prenatal Schedule */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📅 Prenatal Schedule</h2>
        {upcomingSchedule ? (
          <p className="text-lg font-semibold text-ink">{upcomingSchedule.visit_date}</p>
        ) : (
          <p className="text-sm text-muted-2">
            No prenatal schedule has been set yet.
          </p>
        )}
      </div>
 
      {/* Personal Info */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">👤 My Information</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <InfoRow label="Date Registered" value={record.date_registered} />
          <InfoRow label="Age" value={record.age} />
          <InfoRow label="Address" value={record.address} />
          <InfoRow label="Purok" value={record.purok} />
          <InfoRow label="Contact Number" value={record.contact_number} />
          <InfoRow label="LMP" value={record.lmp} />
          <InfoRow label="EDC" value={record.edd} />
          <InfoRow label="Gravida-Para" value={record.gravida_para} />
        </div>
      </div>
 
      {/* Medical Records */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🩺 Medical Records</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
          <InfoRow label="Blood Pressure" value={record.blood_pressure} />
          <InfoRow label="Height" value={record.height_cm ? `${record.height_cm} cm` : null} />
          <InfoRow label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : null} />
        </div>
 
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Checkup History
        </h3>
        {!checkups || checkups.length === 0 ? (
          <p className="text-sm text-muted-2">No checkups recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {checkups.map((c) => (
              <div key={c.id} className="border rounded-lg px-3 py-2">
                <p className="text-sm font-medium">
                  {c.checkup_date} — {c.trimester} Trimester
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {c.blood_pressure ? `BP: ${c.blood_pressure}` : ''}
                  {c.weight_kg ? ` · Weight: ${c.weight_kg}kg` : ''}
                </p>
                {c.notes && <p className="text-xs text-muted mt-1">{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
 
function InfoRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-muted-2 text-xs mb-0.5">{label}</p>
      <p className="text-gray-800">{value ?? '—'}</p>
    </div>
  );
}