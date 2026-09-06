import { createClient } from '@/utils/supabase/server';
 
function tomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
 
export async function checkAndSendPrenatalReminders() {
  try {
    const supabase = await createClient();
    const tomorrow = tomorrowDateString();
 
    const { data: schedule } = await supabase
      .from('prenatal_schedules')
      .select('id, visit_date, reminder_sent')
      .eq('visit_date', tomorrow)
      .eq('reminder_sent', false)
      .maybeSingle();
 
    if (!schedule) return;
 
    const { data: mothers } = await supabase
      .from('pregnant_mothers')
      .select('id, full_name, contact_number')
      .not('contact_number', 'is', null);
 
    const recipients = (mothers ?? []).filter((m) => m.contact_number);
 
    const message = `Paalala: Bukas (${schedule.visit_date}) po ang inyong prenatal checkup sa Barangay Health Center. Mangyaring pumunta sa nakatakdang oras. Salamat!`;
 
    if (recipients.length > 0) {
      const apiKey = process.env.SEMAPHORE_API_KEY;
 
      if (apiKey) {
        const numberList = recipients.map((m) => m.contact_number as string).join(',');
 
        try {
          const response = await fetch('https://api.semaphore.co/api/v4/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              apikey: apiKey,
              number: numberList,
              message,
            }),
          });
 
          const rawText = await response.text();
          let ok = response.ok;
          try {
            JSON.parse(rawText);
          } catch {
            ok = false;
          }
 
          await supabase.from('sms_logs').insert({
            recipient_count: recipients.length,
            recipient_numbers: recipients.map((m) => m.contact_number),
            message,
            status: ok ? 'success' : 'failed',
            error_message: ok ? null : rawText,
            sent_by: null,
          });
        } catch (err) {
          await supabase.from('sms_logs').insert({
            recipient_count: recipients.length,
            recipient_numbers: recipients.map((m) => m.contact_number),
            message,
            status: 'failed',
            error_message: err instanceof Error ? err.message : String(err),
            sent_by: null,
          });
        }
      }
 
      // Log per-mother so it shows up on her own dashboard, regardless of SMS outcome
      await supabase.from('prenatal_schedule_reminders').insert(
        recipients.map((m) => ({
          schedule_id: schedule.id,
          pregnant_mother_id: m.id,
          message,
        }))
      );
    }
 
    // Mark as processed either way, so we never retry/duplicate-send
    await supabase
      .from('prenatal_schedules')
      .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
      .eq('id', schedule.id);
  } catch (err) {
    console.error('checkAndSendPrenatalReminders error:', err);
  }
}